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
import { doc, setDoc, collection, writeBatch } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
// Import wagmi v2 hooks
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Hash } from 'viem';
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { RegistrationABI } from "@/contracts/Registration";
import type { Role, User } from "@/lib/types";
import { contractAddresses } from "@/contracts/addresses";
import { useAuthState } from "@/lib/auth-state";
import { useAuthForm } from "@/hooks/use-auth-form";
import { ConnectWallet } from "./ConnectWallet";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobile: z.string().regex(/^\+91-\d{10}$/, { message: "Enter a valid Indian mobile number (+91-XXXXXXXXXX)." }),
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


export function FarmerRegisterForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);

  const { address, isConnected } = useAccount();
  
  // wagmi v2: useWriteContract replaces useContractWrite
  // It doesn't take args here. They are passed to writeContract()
  const {
    data: txHash, // This is the hash, formerly txResponse?.hash
    writeContract,
    isPending: isWriting, // isLoading is now isPending
    error: writeError
  } = useWriteContract();

  // wagmi v2: useWaitForTransactionReceipt replaces useWaitForTransaction
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash: txHash, // Pass the hash from useWriteContract
    query: {
      enabled: !!txHash,
    }
  });
  
  const { 
    handleTransactionError, 
    handleFirebaseError, 
    registrationStep,
    setRegistrationStep,
    setPendingTransaction 
  } = useAuthForm();

  useEffect(() => {
    setIsClient(true);
    // Cleanup function to reset transaction state
    return () => {
      setLastTxHash(null);
    };
  }, []);

  // Check email existence on blur
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
          description: "This email address is already in use. Please use a different one or log in.",
        });
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
    },
  });

  // Effect to handle post-transaction logic
  useEffect(() => {
    async function handleRegistrationSuccess() {
      if (isConfirmed) {
        const values = form.getValues();
        const authState = useAuthState.getState();
        authState.setRegistrationStep('firebase-pending');

        try {
          // Step 2: Create user in Firebase Auth with retry logic
          let userCredential;
          const maxRetries = 3;
          for (let i = 0; i < maxRetries; i++) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
              break;
            } catch (error: any) {
              if (error.code === 'auth/email-already-in-use' || i === maxRetries - 1) {
                throw error;
              }
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
          }

          if (!userCredential) throw new Error('Failed to create user after retries');
          const user = userCredential.user;

          // Step 3: Save user data to Firestore with transaction
          const batch = writeBatch(firestore);

          // User document
          const userDocRef = doc(firestore, "users", user.uid);
          batch.set(userDocRef, {
            uid: user.uid,
            role: 'Farmer',
            name: values.name,
            email: values.email,
            mobile: values.mobile,
            avatarUrl: `https://i.pravatar.cc/150?u=${values.email}`,
            walletAddress: address,
            kycVerified: false,
            details: {},
            registeredAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });
          
          // Pending approval document
          const approvalsRef = doc(collection(firestore, 'pendingApprovals'));
          batch.set(approvalsRef, {
            userId: user.uid,
            name: values.name,
            role: 'Farmer',
            date: new Date().toISOString(),
            email: values.email,
            mobile: values.mobile,
            walletAddress: address,
            transactionHash: txHash, // Use txHash directly
          });

          // Commit both documents
          await batch.commit();

          // Update auth state
          authState.setUser({
            uid: user.uid,
            role: 'Farmer',
            name: values.name,
            email: values.email,
            mobile: values.mobile,
            walletAddress: address,
            kycVerified: false,
            details: {},
          });
          authState.setRegistrationStep('completed');

          toast({
            title: "Registration Complete!",
            description: "Your registration is confirmed and is now pending admin approval.",
          });
          
          router.push('/login');
        } catch (error: any) {
          authState.setRegistrationStep('idle');
          
          if (error.code === 'auth/email-already-in-use') {
            toast({
              variant: "destructive",
              title: "Email Already Registered",
              description: "This email is already in use. Please log in or use a different email address.",
            });
          } else {
            console.error('Registration error:', error);
            toast({
              variant: "destructive",
              title: "Registration Failed",
              description: "Failed to complete registration. Please try again or contact support if the problem persists.",
            });
          }
        }
      }
    }
    handleRegistrationSuccess();
  }, [isConfirmed, auth, firestore, address, form, router, toast, txHash]); // Use txHash in dependency array

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

  // Monitor transaction response
  useEffect(() => {
    if (txHash) { // Use txHash directly
      setLastTxHash(txHash);
      setPendingTransaction(txHash);
    }
  }, [txHash, setPendingTransaction]); // Use txHash in dependency array

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const authState = useAuthState.getState();

  // Step 1: Check if email already exists first and wait for the result
  // Use 'idle' here to avoid using an unknown registration step value
  authState.setRegistrationStep('idle');
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, values.email);
      if (signInMethods.length > 0) {
        toast({
          variant: "destructive",
          title: "Email Already Registered",
          description: "This email address is already in use. Please use a different one or log in.",
        });
        authState.setRegistrationStep('idle');
        return;
      }
    } catch (err) {
      // If email check fails, bail out and surface error
      console.error('Error checking email before wallet:', err);
      toast({
        variant: 'destructive',
        title: 'Email Check Failed',
        description: 'Unable to verify email existence. Please try again.',
      });
      authState.setRegistrationStep('idle');
      return;
    }

    // Only after confirming the email is not registered, ensure wallet is connected
    if (!isConnected || !address) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to register.",
      });
      authState.setRegistrationStep('idle');
      return;
    }

    try {
      // Start of registration flow (wallet is connected and email is free)
      authState.setRegistrationStep('wallet-connecting');

      // Reset any previous transaction state
      setLastTxHash(null);
      
      // Step 2: Register participant on-chain
      authState.setRegistrationStep('blockchain-pending');
      const roleId = onChainRoleMap['Farmer'];
      if (roleId === undefined) throw new Error("Invalid role for on-chain registration");
      
      // Add more metadata for better identification
      const metadata = JSON.stringify({ 
        name: values.name, 
        firestoreId: "pending",
        email: values.email, // This is safe as it's encrypted on-chain
        timestamp: new Date().toISOString(),
        registrationType: 'web-frontend'
      });
      
      // wagmi v2: All arguments are passed to writeContract
      writeContract?.({
        address: contractAddresses.Registration as `0x${string}`,
        abi: RegistrationABI,
        functionName: 'registerParticipant',
        args: [roleId, metadata],
      });

    } catch (error: any) {
      // Reset registration step
      authState.setRegistrationStep('idle');
      authState.setPendingTransaction(null);

      // Handle specific error cases
      if (error.code === 'ACTION_REJECTED') {
        toast({
          variant: "destructive",
          title: "Transaction Rejected",
          description: "You rejected the transaction. Please try again when ready.",
        });
      } else if (error.message?.includes('insufficient funds')) {
        toast({
          variant: "destructive",
          title: "Insufficient Funds",
          description: "Your wallet doesn't have enough funds for the transaction. Please add funds and try again.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Registration Error",
          description: error.message || "An unexpected error occurred during registration.",
        });
      }
    }
  }

  const isSubmitting = isWriting || isConfirming;
  const isWalletConnected = isClient && isConnected;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Farmer Registration</CardTitle>
        <CardDescription>Create your account. This will require a transaction to register you on-chain.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isWalletConnected && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet first to proceed with registration.
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField 
              control={form.control} 
              name="name" 
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
             <FormField 
              control={form.control} 
              name="email" 
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="you@example.com" 
                      {...field} 
                      onBlur={(e) => {
                        field.onBlur();
                        handleEmailBlur(e.target.value);
                      }}
                    />
                  </FormControl>
                  {emailExists && (
                    <p className="text-sm font-medium text-destructive">
                      This email is already registered. Please use a different email or login.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} 
            />
            <FormField 
              control={form.control} 
              name="mobile" 
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl><Input placeholder="+91-XXXXXXXXXX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
            <FormField 
              control={form.control} 
              name="password" 
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
            <FormField 
              control={form.control} 
              name="confirmPassword" 
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />

            <div className="flex items-center justify-between pt-4">
                <Button variant="outline" asChild>
                    <Link href="/register">Back to roles</Link>
                </Button>
                <div className="flex items-center gap-4">
                  {isClient && !isConnected && <ConnectWallet user={null} />}
                   <Button 
                    type="submit" 
                    className="bg-accent text-accent-foreground hover:bg-accent/90" 
                    disabled={!isWalletConnected || emailExists || isCheckingEmail || isSubmitting}
                   >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isWriting ? 'Confirm in wallet...' : 
                     isConfirming ? 'Processing registration...' : 
                     !isWalletConnected ? 'Connect Wallet First' : 
                     emailExists ? 'Email Already Exists' :
                     'Register On-Chain'}
                  </Button>
                </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}