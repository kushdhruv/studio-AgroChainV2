
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Shipment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Weight } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ShipmentTokenABI } from '@/contracts/ShipmentToken';
import { getContractAddress } from '@/contracts/addresses';
import { canonicalizeShipmentId } from '@/lib/shipment-validation';

const formSchema = z.object({
  weighKg: z.coerce.number().positive("Weight must be a positive number."),
});

export function ProposeWeighmentDialog({ shipment }: { shipment: Shipment }) {
  const [isOpen, setIsOpen] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { address: transporterAddress } = useAccount();
  
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ 
    hash: txHash as `0x${string}` || undefined 
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { weighKg: 0 },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!transporterAddress) {
      toast({ variant: 'destructive', title: 'Transporter wallet not connected' });
      return;
    }

    try {
      // Step 1: Encode shipment ID
      const shipmentIdBytes32 = canonicalizeShipmentId(shipment.id);
      const weightInKg = BigInt(Math.floor(values.weighKg));
      
      // Step 2: Call smart contract
      const contractAddress = getContractAddress('ShipmentToken');
      if (!contractAddress) {
        throw new Error('ShipmentToken contract address not found');
      }

      const txHashResult = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: ShipmentTokenABI,
        functionName: 'proposeWeighment',
        args: [{
          shipmentId: shipmentIdBytes32,
          weight: weightInKg,
          proposer: transporterAddress,
        }],
      });

      setTxHash(txHashResult);
      toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

      // Step 3: Save to Firestore (optimistic, completes after confirmation)
      const proposal = {
        shipmentId: shipment.id,
        shipmentContent: shipment.content,
        shipmentOrigin: shipment.origin,
        shipmentDestination: shipment.destination,
        proposedWeight: values.weighKg,
        proposerAddress: transporterAddress,
        txHash: txHashResult,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'weighmentProposals'), proposal);

      toast({ 
        title: 'Weighment Proposal Submitted', 
        description: 'Your proposal has been sent to the Oracles for approval.' 
      });
      setIsOpen(false);
      form.reset();
      setTxHash(null);
    } catch (e: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Submission Failed', 
        description: e.message 
      });
      setTxHash(null);
    }
  }

  const isSubmitting = isWriting || isConfirming;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Weight className="mr-2 h-4 w-4" />
          Propose Weighment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propose a Weighment</DialogTitle>
          <DialogDescription>
            Submit a weighment for shipment {shipment.id.slice(0, 8)}... This will be recorded on-chain and sent to an Oracle for approval.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="weighKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Weight (in Kilograms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isWriting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isWriting ? 'Confirm in Wallet...' : isConfirming ? 'Processing...' : 'Submit Weighment Proposal'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
