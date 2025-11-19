'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { Role, User, GovernmentDetails } from "@/lib/types";
import { contractAddresses } from "@/contracts/addresses";
import { ConnectWallet } from "@/components/auth/ConnectWallet";
import { useAuthState } from "@/lib/auth-state";
// **FIX: Import the centralized role map**
import { onChainRoleMap } from "@/lib/constants";

const formSchema = z.object({
  authorityName: z.string().min(3, { message: "Authority name is required." }),
  officialEmail: z.string().email({ message: "A valid official email is required." }),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
  authorityType: z.enum(['District', 'Central', 'State', 'Block'], { required_error: "Please select an authority type." }),
  department: z.string().min(2, { message: "Department is required." }),
  jurisdictionArea: z.string().min(2, { message: "Jurisdiction area is required." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// **REMOVED: The incorrect local role map is no longer needed**

export default function GovernmentRegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { setIsClient(true); }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { authorityName: "", officialEmail: "", password: "", confirmPassword: "", department: "", jurisdictionArea: "" },
  });

  const handleEmailBlur = async (email: string) => {
    if (!email) return;
    setIsCheckingEmail(true);
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      setEmailExists(signInMethods.length > 0);
      if (signInMethods.length > 0) {
        toast({ variant: "destructive", title: "Email Already Registered" });
      }
    } catch (error) {
      console.error("Email check failed:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  useEffect(() => {
    async function handleRegistration() {
      if (isConfirmed) {
        const authState = useAuthState.getState();
        authState.setRegistrationStep('firebase-pending');
        const values = form.getValues();
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, values.officialEmail, values.password);
          const user = userCredential.user;
          const normalizedAddress = address ? address.toLowerCase() : undefined;

          const governmentDetails: GovernmentDetails = {
              authorityType: values.authorityType,
              department: values.department,
              jurisdictionArea: values.jurisdictionArea,
          };

          const userProfile: User = {
            uid: user.uid,
            role: 'Government',
            name: values.authorityName,
            email: values.officialEmail,
            walletAddress: normalizedAddress,
            kycVerified: true, 
            details: governmentDetails,
          };

          await setDoc(doc(firestore, "users", user.uid), {
            ...userProfile,
            registeredAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });

          authState.setUser(userProfile);
          authState.setRegistrationStep('completed');
          toast({ title: "Registration Successful", description: "Government account created." });
          router.push("/dashboard/oversight");

        } catch (error: any) {
          authState.setRegistrationStep('idle');
          toast({ variant: "destructive", title: "Account Creation Failed", description: error.message });
        }
      }
    }
    handleRegistration();
  }, [isConfirmed, auth, firestore, address, form, router, toast]);

  useEffect(() => {
    const error = writeError || confirmError;
    if (error) {
      toast({ variant: "destructive", title: "On-Chain Registration Failed", description: error.message.split('\n')[0] });
      useAuthState.getState().setRegistrationStep('idle');
    }
  }, [writeError, confirmError, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const authState = useAuthState.getState();
    authState.setRegistrationStep('idle');
    
    if (!isConnected || !address) {
      toast({ variant: "destructive", title: "Wallet Not Connected" });
      return;
    }
    if (emailExists) {
        toast({ variant: "destructive", title: "Email Already Registered" });
        return;
    }

    try {
      authState.setRegistrationStep('blockchain-pending');
      // **FIX: Uses the correct, complete role map**
      const roleId = onChainRoleMap['Government'];
      const metadata = JSON.stringify({ name: values.authorityName, jurisdiction: values.jurisdictionArea, timestamp: new Date().toISOString() });

      writeContract({
        abi: RegistrationABI,
        address: contractAddresses.Registration as `0x${string}`,
        functionName: 'registerParticipant',
        args: [roleId, metadata],
      });
    } catch (error: any) {
      authState.setRegistrationStep('idle');
      toast({ variant: "destructive", title: "Registration Error", description: error.message });
    }
  }

  const isSubmitting = isWriting || isConfirming;
  const isWalletConnected = isClient && isConnected;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Government Authority Registration</CardTitle>
        <CardDescription>Create an account for a government entity. This requires an on-chain transaction.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isWalletConnected && (
          <Alert className="mb-6" variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Please connect your wallet to register.</AlertDescription></Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="authorityName" render={({ field }) => (<FormItem><FormLabel>Authority Name</FormLabel><FormControl><Input placeholder="e.g., Ministry of Agriculture" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="officialEmail" render={({ field }) => (<FormItem><FormLabel>Official Email</FormLabel><FormControl><Input type="email" placeholder="contact@gov.in" {...field} onBlur={(e) => { field.onBlur(); handleEmailBlur(e.target.value); }} /></FormControl>{emailExists && <p className="text-sm font-medium text-destructive">This email is already in use.</p>}<FormMessage /></FormItem>)} />
            
            <FormField control={form.control} name="authorityType" render={({ field }) => (<FormItem><FormLabel>Authority Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an authority type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Central">Central</SelectItem><SelectItem value="State">State</SelectItem><SelectItem value="District">District</SelectItem><SelectItem value="Block">Block</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            
            <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><FormControl><Input placeholder="e.g., Food Safety and Standards" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="jurisdictionArea" render={({ field }) => (<FormItem><FormLabel>Jurisdiction Area</FormLabel><FormControl><Input placeholder="e.g., State of Maharashtra" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <div className="flex items-center justify-between pt-4">
                <Button variant="outline" asChild><Link href="/register">Back to roles</Link></Button>
                <div className="flex items-center gap-4">
                  {isClient && !isConnected && <ConnectWallet user={null} />}
                  <Button type="submit" disabled={!isWalletConnected || emailExists || isCheckingEmail || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isWriting ? 'Confirm in wallet...' : isConfirming ? 'Processing...' : 'Register On-Chain'}
                  </Button>
                </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
