'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { RegistrationABI } from "@/contracts/Registration";
import type { Role } from "@/lib/types";
import { contractAddresses } from "@/contracts/addresses";
import { ConnectWallet } from "./ConnectWallet";

const formSchema = z.object({
  companyName: z.string().min(2, "Company name is required."),
  email: z.string().email(),
  mobile: z.string().regex(/^\+91-\d{10}$/, { message: "Enter a valid Indian mobile number (+91-XXXXXXXXXX)." }),
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

export function IndustryRegisterForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      email: "",
      mobile: "+91-",
      password: "",
      confirmPassword: "",
    },
  });

  const handleEmailBlur = async (email: string) => {
    if (!email) return;
    setIsCheckingEmail(true);
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      setEmailExists(signInMethods.length > 0);
      if (signInMethods.length > 0) {
        toast({
          variant: "destructive",
          title: "Email Already Registered",
          description: "This email address is already in use.",
        });
      }
    } catch (error) {
      console.error("Error checking email:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  useEffect(() => {
    async function handleRegistrationSuccess() {
      if (isConfirmed) {
        const values = form.getValues();
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
          const user = userCredential.user;

          // **KEY FIX:** Store wallet address in lowercase and use it as the uid
          // This makes wallet login work without complex searches
          const normalizedAddress = address ? address.toLowerCase() : null;
          const firestoreUid = normalizedAddress || user.uid;

          const userDocRef = doc(firestore, "users", firestoreUid);
          await setDoc(userDocRef, {
            uid: firestoreUid,
            name: values.companyName,
            email: values.email,
            mobile: values.mobile,
            role: 'Industry',
            kycVerified: false,
            details: {},
            avatarUrl: `https://i.pravatar.cc/150?u=${values.email}`,
            walletAddress: normalizedAddress,
            registeredAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });

          // **FIX:** Automatic addition to KYC queue has been removed.

          toast({
            title: "Registration Complete!",
            description: "Your account has been created. You can now log in.",
          });
          router.push("/login");

        } catch (error: any) {
          if (error.code === "auth/email-already-in-use") {
            toast({
              variant: "destructive",
              title: "Email Already Registered",
              description: "This email is already in use. Please log in or use a different email address.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Registration Failed",
              description: "Failed to create your profile after the transaction. Please contact support.",
            });
          }
        }
      }
    }
    handleRegistrationSuccess();
  }, [isConfirmed, auth, firestore, address, form, router, toast]);

  useEffect(() => {
    if (writeError || confirmError) {
      const error = writeError || confirmError;
      toast({
        variant: "destructive",
        title: "On-Chain Registration Failed",
        description: error?.message?.split('\n')[0] || "The transaction was rejected or failed.",
      });
    }
  }, [writeError, confirmError, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isConnected || !address) {
      toast({ variant: "destructive", title: "Wallet Not Connected", description: "Please connect your wallet to register." });
      return;
    }

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, values.email);
      if (signInMethods.length > 0) {
        toast({ variant: "destructive", title: "Email Already Registered", description: "This email address is already in use." });
        return;
      }

      const roleId = onChainRoleMap['Industry'];
      if (roleId === undefined) throw new Error("Invalid role for on-chain registration");

      const metadata = JSON.stringify({ name: values.companyName, email: values.email, mobile: values.mobile, timestamp: new Date().toISOString() });

      writeContract({
        abi: RegistrationABI,
        address: contractAddresses.Registration as `0x${string}`,
        functionName: 'registerParticipant',
        args: [roleId, metadata],
      });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Registration Error", description: error.message || "An unexpected error occurred." });
    }
  }

  const isSubmitting = isPending || isConfirming;
  const isWalletConnected = isClient && isConnected;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Industry Registration</CardTitle>
        <CardDescription>Create your account. This will require a transaction to register you on-chain.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isWalletConnected && (
            <Alert className="mb-6" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please connect your wallet first to proceed with registration.</AlertDescription>
            </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="companyName" render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl><Input placeholder="Your company name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Business Email</FormLabel>
                <FormControl>
                    <Input 
                        type="email" 
                        placeholder="business@company.com" 
                        {...field} 
                        onBlur={(e) => {
                            field.onBlur();
                            handleEmailBlur(e.target.value);
                        }}
                    />
                </FormControl>
                {emailExists && <p className="text-sm font-medium text-destructive">This email is already registered.</p>}
                <FormMessage />
              </FormItem>
            )} />
                <FormField control={form.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input type="tel" placeholder="+1 555 555 5555" {...field} /></FormControl>
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
                <Button variant="outline" asChild>
                    <Link href="/register">Back to roles</Link>
                </Button>
                <div className="flex items-center gap-4">
                  {isClient && !isConnected && <ConnectWallet user={null} />}
                  <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={!isWalletConnected || emailExists || isCheckingEmail || isSubmitting}>
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
