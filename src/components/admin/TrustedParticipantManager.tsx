
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useWriteContract, useAccount } from 'wagmi';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RegistrationABI } from '@/contracts/Registration';
import { contractAddresses } from '@/contracts/addresses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/lib/types';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const onChainRoleMap: { [key in Role]?: number } = {
  Farmer: 1,
  Transporter: 2,
  Industry: 3,
  Government: 4,
  Admin: 5,
  Oracle: 6,
};

const formSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address.'),
  name: z.string().min(3, 'Participant name is required.'),
  role: z.enum(['Government', 'Admin']),
  email: z.string().email(),
});

export function TrustedParticipantManager() {
  const { toast } = useToast();
  const { address: adminAddress } = useAccount();
  const auth = useAuth();
  const firestore = useFirestore();
  const { writeContractAsync, isPending } = useWriteContract();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { address: '', name: '', email: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { address, name, role, email } = values;

    if (!adminAddress) {
        toast({ variant: 'destructive', title: 'Admin wallet not connected.'});
        return;
    }

    try {
      const roleId = onChainRoleMap[role];
      if (roleId === undefined) throw new Error("Invalid role for on-chain registration");

      const tempPassword = "password123";
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      await new Promise(resolve => setTimeout(resolve, 1000)); // small delay to ensure user creation
      const user = userCredential.user;

      const metadata = JSON.stringify({ name: name, firestoreId: user.uid, createdBy: adminAddress });

      // This function is owner-only, so the admin wallet must be the contract owner.
      await writeContractAsync({
        abi: RegistrationABI,
        address: contractAddresses.Registration,
        functionName: 'registerTrustedParticipant',
        args: [address as `0x${string}`, roleId, metadata],
      });

      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        kycVerified: true, // Trusted participants are auto-verified
        avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
        walletAddress: address,
        details: {},
      });

      toast({
        title: 'Trusted Participant Registered',
        description: `${name} has been registered as a ${role} on-chain.`,
      });
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Registration Failed', description: e.message });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Trusted Participant Registration</CardTitle>
        <CardDescription>
          Register new Government or Admin users. These participants are automatically KYC-verified on-chain by the contract owner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participant Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@dept.gov" {...field} />
                  </FormControl>
                   <CardDescription>A temporary password "password123" will be set.</CardDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
