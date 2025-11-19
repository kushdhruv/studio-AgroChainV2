'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button-provider";
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
import type { Role, User, FarmerDetails } from "@/lib/types";
import { contractAddresses } from "@/contracts/addresses";
import { useAuthState } from "@/lib/auth-state";
import { useAuthForm } from "@/hooks/use-auth-form";
import { ConnectWallet } from "./ConnectWallet";
// **FIX: Import the centralized role map**
import { onChainRoleMap } from "@/lib/constants";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobile: z.string().regex(/^\+91-\d{10}$/, { message: "Enter a valid Indian mobile number (+91-XXXXXXXXXX)." }),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
  aadhaarNumber: z.string().length(12, { message: "Aadhaar number must be 12 digits." }),
  farmLocation: z.object({
      state: z.string().min(2, { message: "State is required." }),
      district: z.string().min(2, { message: "District is required." }),
      village: z.string().min(2, { message: "Village is required." }),
      pincode: z.string().length(6, { message: "Pincode must be 6 digits." }),
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// **REMOVED: The incorrect local role map is no longer needed**

export function FarmerRegisterForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: txHash, writeContract, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash: txHash });
  
  const { setPendingTransaction } = useAuthForm();

  useEffect(() => { setIsClient(true); }, []);

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
      console.error("Error checking email:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "+91-",
      email: "",
      password: "",
      confirmPassword: "",
      aadhaarNumber: "",
      farmLocation: { state: "", district: "", village: "", pincode: "" },
    },
  });

  useEffect(() => {
    async function handleRegistrationSuccess() {
      if (isConfirmed) {
        const values = form.getValues();
        const authState = useAuthState.getState();
        authState.setRegistrationStep('firebase-pending');

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
          const user = userCredential.user;
          const normalizedAddress = address ? address.toLowerCase() : undefined;

          // **KEY FIX: Use wallet address as the uid for Firestore document
          // This makes wallet login work without complex searches
          const firestoreUid = normalizedAddress || user.uid;

          const farmerDetails: FarmerDetails = {
              aadhaarEncrypted: values.aadhaarNumber, 
              farm: {
                  location: values.farmLocation
              }
          };

          const userProfile: User = {
            uid: firestoreUid,
            role: 'Farmer',
            name: values.name,
            email: values.email,
            mobile: values.mobile,
            walletAddress: normalizedAddress,
            kycVerified: false,
            details: farmerDetails,
          };

          // Store with wallet address as document ID, not Firebase uid
          await setDoc(doc(firestore, "users", firestoreUid), {
            ...userProfile,
            registeredAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });
          
          authState.setUser(userProfile);
          authState.setRegistrationStep('completed');

          toast({ title: "Registration Complete!", description: "Your account has been created. You can now log in." });
          router.push('/login');

        } catch (error: any) {
          authState.setRegistrationStep('idle');
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description: (error?.message || "An unexpected error occurred creating your account."),
          });
        }
      }
    }
    handleRegistrationSuccess();
  }, [isConfirmed, auth, firestore, address, form, router, toast]);

  useEffect(() => {
    const error = writeError || confirmError;
    if (error) {
      toast({
        variant: "destructive",
        title: "On-Chain Registration Failed",
        description: (error?.message?.split('\n')[0] || "The transaction was rejected or failed."),
      });
      useAuthState.getState().setRegistrationStep('idle');
    }
  }, [writeError, confirmError, toast]);

  useEffect(() => {
    if (txHash) setPendingTransaction(txHash);
  }, [txHash, setPendingTransaction]);

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
      const roleId = onChainRoleMap['Farmer'];
      const metadata = JSON.stringify({ name: values.name, email: values.email, mobile: values.mobile, timestamp: new Date().toISOString() });
      
      writeContract({
        address: contractAddresses.Registration as `0x${string}`,
        abi: RegistrationABI,
        functionName: 'registerParticipant',
        args: [roleId, metadata],
      });

    } catch (error: any) {
      authState.setRegistrationStep('idle');
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: (error?.message || "An unexpected error occurred."),
      });
    }
  }

  const isSubmitting = isWriting || isConfirming;
  const isWalletConnected = isClient && isConnected;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Farmer Registration</CardTitle>
        <CardDescription>Create your account. This requires an on-chain transaction.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isWalletConnected && (
          <Alert className="mb-6" variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Please connect your wallet first.</AlertDescription></Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="you@example.com" {...field} onBlur={(e) => { field.onBlur(); handleEmailBlur(e.target.value); }} /></FormControl>{emailExists && <p className="text-sm font-medium text-destructive">This email is already registered.</p>}<FormMessage /></FormItem>)} />
            <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="+91-XXXXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="aadhaarNumber" render={({ field }) => (<FormItem><FormLabel>Aadhaar Number</FormLabel><FormControl><Input placeholder="12-digit number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <div className="space-y-2 pt-2">
              <FormLabel>Farm Location</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="farmLocation.state" render={({ field }) => (<FormItem><FormControl><Input placeholder="State" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="farmLocation.district" render={({ field }) => (<FormItem><FormControl><Input placeholder="District" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="farmLocation.village" render={({ field }) => (<FormItem><FormControl><Input placeholder="Village" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="farmLocation.pincode" render={({ field }) => (<FormItem><FormControl><Input placeholder="Pincode" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <div className="flex items-center justify-between pt-4">
                <Button variant="outline" asChild><Link href="/register">Back to roles</Link></Button>
                <div className="flex items-center gap-4">
                  {isClient && !isConnected && <ConnectWallet user={null} />}
                   <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={!isWalletConnected || emailExists || isCheckingEmail || isSubmitting}>
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
