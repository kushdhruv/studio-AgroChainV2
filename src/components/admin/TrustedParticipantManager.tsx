
'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useWriteContract, useAccount } from 'wagmi';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getContractAddress } from '@/contracts/addresses';
import { RegistrationABI } from '@/contracts/Registration';
import { OracleManagerABI } from '@/contracts/OracleManager'; // Import the OracleManager ABI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { onChainRoleMap } from '@/lib/constants';
import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, connectAuthEmulator, Auth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

const formSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address.'),
  name: z.string().min(3, 'Participant name is required.'),
  role: z.enum(['Government', 'Admin', 'Oracle']),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
});

const useSecondaryAuth = (): Auth => {
  const secondaryApp = useMemo((): FirebaseApp => {
    const appName = 'secondary-auth-app';
    const existingApp = getApps().find(app => app.name === appName);
    return existingApp || initializeApp(firebaseConfig, appName);
  }, []);

  const secondaryAuth = useMemo((): Auth => {
    const auth = getAuth(secondaryApp);
    if (process.env.NODE_ENV === 'development') {
      try {
        connectAuthEmulator(auth, 'http://127.0.0.1:9098');
      } catch (e) {}
    }
    return auth;
  }, [secondaryApp]);

  return secondaryAuth;
};

export function TrustedParticipantManager() {
  const { address: adminAddress } = useAccount();
  const firestore = useFirestore();
  const secondaryAuth = useSecondaryAuth();
  const { writeContractAsync, isPending } = useWriteContract();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { address: '', name: '', email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { address, name, role, email, password } = values;
    const normalizedAddress = address.toLowerCase() as `0x${string}`;
    const toastId = toast.loading('Starting registration process...');

    if (!adminAddress) {
      toast.error('Admin wallet not connected.', { id: toastId });
      return;
    }

    try {
      toast.loading('Creating Firebase account...', { id: toastId });
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const firebaseUser = userCredential.user;
      if (!firebaseUser) throw new Error('Could not create Firebase user.');

      const metadata = JSON.stringify({ name, createdBy: adminAddress });

      toast.loading(`Registering ${role} on-chain...`, { id: toastId });

      // CORRECTED LOGIC: Use the correct contract based on the selected role
      if (role === 'Oracle') {
        const oracleManagerAddress = getContractAddress('OracleManager');
        if (!oracleManagerAddress) throw new Error('OracleManager contract address not found for this network.');
        
        await writeContractAsync({
          abi: OracleManagerABI,
          address: oracleManagerAddress,
          functionName: 'addOracle',
          args: [normalizedAddress, metadata],
        });

      } else {
        const registrationContractAddress = getContractAddress('Registration');
        if (!registrationContractAddress) throw new Error('Registration contract address not found for this network.');
        
        const roleId = onChainRoleMap[role];
        if (roleId === undefined) throw new Error('Invalid role for on-chain registration');

        await writeContractAsync({
          abi: RegistrationABI,
          address: registrationContractAddress,
          functionName: 'registerTrustedParticipant',
          args: [normalizedAddress, roleId, metadata],
        });
      }

      // Use normalized wallet address as the Firestore doc ID for consistency with wallet login flows
      const userDocRef = doc(firestore, 'users', normalizedAddress);
      const userData = {
        uid: normalizedAddress, // Use wallet address as uid for consistency
        name: name,
        email: email,
        role: role,
        walletAddress: normalizedAddress,
        kycVerified: true,
        details: {},
        avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
      };

      toast.loading('Saving user data to database...', { id: toastId });
      await setDoc(userDocRef, userData, { merge: true });

      toast.success(`${name} has been successfully registered as a ${role}.`, { id: toastId });
      form.reset();

    } catch (e: any) {
      console.error('Registration Error:', e);
      const errorMessage = e.code === 'auth/email-already-in-use'
        ? `An account with the email "${email}" already exists.`
        : e?.cause?.shortMessage || e.message || 'An unknown error occurred.';
      toast.error(`Registration Failed: ${errorMessage}`, { id: toastId, duration: 6000 });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trusted Participant Registration</CardTitle>
        <CardDescription>
          Register new Government, Admin, or Oracle users. These participants are automatically KYC-verified.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ministry of Agriculture" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Participant Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@dept.gov" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-end gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Participant Wallet Address</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Government">Government</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Oracle">Oracle</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Trusted Participant
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
