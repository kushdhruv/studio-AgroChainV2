'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { RegistrationABI } from "@/contracts/Registration";
import type { Role } from "@/lib/types";
import { contractAddresses } from "@/contracts/addresses";
import { ConnectWallet } from "./ConnectWallet";
import { usePublicClient } from 'wagmi';



const formSchema = z.object({
  name: z.string().min(2, "Name is required."),
  mobile: z.string().regex(/^\+91-\d{10}$/, "Enter a valid Indian mobile number."),
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const onChainRoleMap: { [key in Role]?: number } = {
    Farmer: 1,
    Transporter: 2,
    Industry: 3,
    Government: 4,
    Admin: 5,
};


export function TransporterRegisterForm() {
  const publicClient = usePublicClient();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: hash, writeContractAsync, isPending, error: contractError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "+91-",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

 useEffect(() => {
  async function handleRegistrationSuccess() {
    if (!isConfirmed) return;

    const values = form.getValues();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      await new Promise((resolve) => setTimeout(resolve, 1000)); // small delay

      const user = userCredential.user;

      // ✅ Step 1: Save Transporter user profile
      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        role: "Transporter",
        kycVerified: false,
        details: {},
        avatarUrl: `https://i.pravatar.cc/150?u=${values.email}`,
        walletAddress: address,
      });

      // ✅ Step 2: Send approval request ONLY to admin, not oracle
      // We'll tag this with a type field so Oracles can filter it out.
      const approvalsRef = collection(firestore, "pendingApprovals");

      await addDocumentNonBlocking(approvalsRef, {
        userId: user.uid,
        name: values.name,
        role: "Transporter",
        date: new Date().toISOString(),
        type: "admin", // 👈 mark this as admin-only approval
      });

      // ✅ Step 3: Show confirmation message
      toast({
        title: "Registration Complete!",
        description:
          "Your registration is confirmed and pending admin review (no oracle approval needed).",
      });

      router.push("/login");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        toast({
          variant: "destructive",
          title: "Email Already Registered",
          description:
            "This email is already in use. Please log in or use a different email address.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Post-transaction Error",
          description:
            error.message ||
            "An unexpected error occurred while creating your profile.",
        });
      }
    }
  }

  handleRegistrationSuccess();
}, [isConfirmed, auth, firestore, address, form, router, toast]);


  useEffect(() => {
    if (contractError) {
      toast({
        variant: "destructive",
        title: "On-Chain Registration Failed",
        description: contractError.message.split('\n')[0] || "The transaction was rejected or failed.",
      });
    }
  }, [contractError, toast]);

async function onSubmit(values: z.infer<typeof formSchema>) {
  if (!isConnected || !address) {
    toast({
      variant: "destructive",
      title: "Wallet Not Connected",
      description: "Please connect your wallet to register.",
    });
    return;
  }

 
  if (!publicClient) {
    toast({
      variant: "destructive",
      title: "Network Error",
      description: "Public client not available. Check your RPC or chain setup.",
    });
    return;
  }

  try {
    // Step 1: Check if email already exists
    const signInMethods = await fetchSignInMethodsForEmail(auth, values.email);
    if (signInMethods.length > 0) {
      toast({
        variant: "destructive",
        title: "Email Already Registered",
        description: "This email address is already in use. Please use a different one or log in.",
      });
      return;
    }

    // Step 2: Register on-chain
    const roleId = onChainRoleMap['Transporter'];
    if (roleId === undefined) throw new Error("Invalid role for on-chain registration");

    const metadata = JSON.stringify({ name: values.name, firestoreId: "pending" });

    const txResult: any = await writeContractAsync({
      abi: RegistrationABI,
      address: contractAddresses.Registration,
      functionName: 'registerParticipant',
      args: [roleId, metadata],
    });

    const txHash = (txResult?.hash || txResult) as `0x${string}`;
    if (!txHash) throw new Error('Transaction hash not returned by wallet.');

    toast({ title: "Transaction Sent", description: "Waiting for confirmation..." });

    // Step 3: Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt?.status !== 'success') {
      throw new Error('Transaction failed or reverted.');
    }

    toast({
      title: "Transaction Confirmed",
      description: "On-chain registration successful!",
    });

    // ✅ Continue your post-transaction logic here (Firestore, redirect, etc.)

  } catch (error: any) {
    if (error?.code === 'ACTION_REJECTED') return; // user rejected wallet tx
    toast({
      variant: "destructive",
      title: "Transaction Error",
      description: error.message || "Unexpected error during registration.",
    });
  }
}
  const isSubmitting = isPending || isConfirming;
  const isWalletConnected = isClient && isConnected;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Transporter Registration</CardTitle>
        <CardDescription>Create your account. This will require a transaction to register you on-chain.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="mobile" render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl><Input placeholder="+91-XXXXXXXXXX" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="flex items-center justify-between pt-4">
                <Button variant="link" asChild>
                    <Link href="/register">Back to roles</Link>
                </Button>
                <div className="flex items-center gap-4">
                  {isClient && !isConnected && <ConnectWallet user={null} />}
                  <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting || !isWalletConnected}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isPending ? 'Confirm in wallet...' : isConfirming ? 'Processing transaction...' : 'Register On-Chain'}
                  </Button>
                </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
