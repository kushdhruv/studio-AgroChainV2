
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
import { doc, setDoc, collection } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useAccount, useWriteContract } from 'wagmi';
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { RegistrationABI } from "@/contracts/Registration";
import type { Role } from "@/lib/types";
import { contractAddresses } from "@/contracts/addresses";

const formSchema = z.object({
  authorityName: z.string().min(3, "Authority name is required."),
  email: z.string().email(),
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

export function GovernmentRegisterForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      authorityName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
     if (!isConnected || !address) {
      toast({ variant: "destructive", title: "Wallet Not Connected", description: "Please connect your wallet to register." });
      return;
    }

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, values.email);
      if (signInMethods.length > 0) {
        toast({
          variant: "destructive",
          title: "Email Already Registered",
          description: "This email address is already in use. Please use a different one or log in.",
        });
        return;
      }

      setIsSubmitting(true);
      
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await new Promise(resolve => setTimeout(resolve, 1000)); // small delay to ensure user creation
      const user = userCredential.user;

      const roleId = onChainRoleMap['Government'];
      if (roleId === undefined) throw new Error("Invalid role for on-chain registration");
      const metadata = JSON.stringify({ name: values.authorityName, firestoreId: user.uid });
      
      await writeContractAsync({
        abi: RegistrationABI,
        address: contractAddresses.Registration,
        functionName: 'registerParticipant',
        args: [roleId, metadata],
      });

      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        name: values.authorityName,
        email: values.email,
        role: 'Government',
        kycVerified: false, 
        details: {},
        avatarUrl: `https://i.pravatar.cc/150?u=${values.email}`,
        walletAddress: address,
      });

      const approvalsRef = collection(firestore, 'pendingApprovals');
      addDocumentNonBlocking(approvalsRef, {
        userId: user.uid,
        name: values.authorityName,
        role: 'Government',
        date: new Date().toISOString(),
      });

      toast({
        title: "Registration Transaction Sent",
        description: "Please confirm in your wallet. Your registration will then be submitted for admin approval.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Government Authority Registration</CardTitle>
        <CardDescription>Create an account. This will require a transaction to register you on-chain.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="authorityName" render={({ field }) => (
              <FormItem>
                <FormLabel>Authority/Department Name</FormLabel>
                <FormControl><Input placeholder="e.g., Department of Agriculture" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl><Input type="email" placeholder="contact@dept.gov.in" {...field} /></FormControl>
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
                <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting || isPending || !isConnected}>
                   {(isSubmitting || isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                   {isPending ? 'Confirm in wallet...' : isSubmitting ? 'Processing...' : 'Register On-Chain'}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
