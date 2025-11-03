
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useWriteContract, useAccount } from 'wagmi';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc,setDoc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { OracleManagerABI } from '@/contracts/OracleManager';
import { contractAddresses } from '@/contracts/addresses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2 } from 'lucide-react';
import type { User } from '@/lib/types';

interface Oracle {
  id: string;
  address: `0x${string}`;
  name: string;
  active: boolean;
  dateAdded: string;
}

const formSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address.'),
  name: z.string().min(3, 'Oracle name is required.'),
});

export function OracleManager() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { address: adminAddress, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const oraclesQuery = useMemoFirebase(() => query(collection(firestore, 'oracles')), [firestore]);
  const { data: oracles, isLoading } = useCollection<Oracle>(oraclesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { address: '', name: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isConnected) {
      toast({ variant: 'destructive', title: 'Wallet not connected' });
      return;
    }

    try {
      const metadata = JSON.stringify({ name: values.name, addedBy: adminAddress });
      // Call the smart contract to register the oracle on-chain
      await writeContractAsync({
        abi: OracleManagerABI,
        address: contractAddresses.OracleManager,
        functionName: 'addOracle',
        args: [values.address as `0x${string}`, metadata],
      });

      // Also save the oracle's info to Firestore for easy listing in the UI
      const oracleDocRef = doc(firestore, 'oracles', values.address);
      setDocumentNonBlocking(oracleDocRef, {
      address: values.address,
      name: values.name,
      active: true,
      dateAdded: new Date().toISOString(),
      });
      await setDoc(doc(firestore, 'users', values.address), {
      uid: values.address,
      role: 'Oracle',
      name: values.name,
      email: `${values.name.toLowerCase().replace(/\s+/g, '')}@oracle.agrichain.com`,
      walletAddress: values.address,
      kycVerified: true,
      active: true,
      createdAt: new Date().toISOString(),
    });
      toast({
        title: 'Oracle Registration Sent',
        description: 'Please confirm the transaction in your wallet.',
      });
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Registration Failed', description: e.message });
    }
  }

  async function handleRevoke(oracle: Oracle) {
     if (!isConnected) {
      toast({ variant: 'destructive', title: 'Wallet not connected' });
      return;
    }
    
    try {
        await writeContractAsync({
            abi: OracleManagerABI,
            address: contractAddresses.OracleManager,
            functionName: 'removeOracle',
            args: [oracle.address],
        });

        const oracleDocRef = doc(firestore, 'oracles', oracle.id);
        deleteDocumentNonBlocking(oracleDocRef);

        toast({
            title: 'Oracle Removal Sent',
            description: 'Please confirm the transaction in your wallet.',
        });

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Removal Failed', description: e.message });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Oracle Management</CardTitle>
        <CardDescription>Register and manage trusted oracles that can provide external data to smart contracts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Oracle Wallet Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Oracle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., WeatherAPI Oracle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending || !isConnected}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Oracle
            </Button>
          </form>
        </Form>

        <div>
          <h4 className="font-medium mb-2">Registered Oracles</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center h-24">Loading oracles...</TableCell></TableRow>}
              {!isLoading && oracles && oracles.length > 0 ? (
                oracles.map((oracle) => (
                  <TableRow key={oracle.id}>
                    <TableCell className="font-medium">{oracle.name}</TableCell>
                    <TableCell className="font-mono text-xs">{oracle.address}</TableCell>
                    <TableCell>{new Date(oracle.dateAdded).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="icon" onClick={() => handleRevoke(oracle)} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove Oracle</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoading && <TableRow><TableCell colSpan={4} className="text-center h-24">No oracles registered.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
