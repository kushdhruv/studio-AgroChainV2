
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Shipment, WeighmentProposal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useWriteContract, useAccount, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { ShipmentTokenABI } from '@/contracts/ShipmentToken';
import { contractAddresses } from '@/contracts/addresses';
import { uploadJsonToIPFS } from '@/lib/actions';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateWeighmentPayloadHash, signPayloadHashWithWallet } from '@/lib/oracle-signature';

const formSchema = z.object({
  weighKg: z.coerce.number().positive("Weight must be a positive number."),
});

export function ApproveWeighmentDialog({ proposal, shipment }: { proposal: WeighmentProposal, shipment: Shipment | undefined }) {
  const [isOpen, setIsOpen] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { address: oracleAddress } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` || undefined });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { weighKg: proposal.proposedWeight || 0 },
  });

  useEffect(() => {
    form.reset({ weighKg: proposal.proposedWeight || 0 });
  }, [proposal, form]);
  
  if (!shipment) {
      return <Button variant="outline" size="sm" disabled>Shipment not found</Button>;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!shipment) {
        toast({ variant: 'destructive', title: 'Error', description: 'Shipment data is not available.' });
        return;
    }
    if (!oracleAddress) {
      toast({ variant: 'destructive', title: 'Oracle wallet not connected' });
      return;
    }
    try {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const nonce = BigInt(Date.now());
      const weighmentDetails = {
        shipmentId: shipment.id,
        weight: values.weighKg,
        timestamp: Number(timestamp),
        nonce: Number(nonce),
        oracle: oracleAddress,
        proposer: proposal.proposerAddress
      };

      const ipfsResponse = await uploadJsonToIPFS(weighmentDetails);
      if (!ipfsResponse.success || !ipfsResponse.ipfsHash) {
        throw new Error(ipfsResponse.error || "Could not upload weighment data to IPFS.");
      }

      const payloadHash = generateWeighmentPayloadHash({
        chainId: BigInt(chainId),
        shipmentId: shipment.shipmentIdOnChain as `0x${string}`,
        weighKg: BigInt(values.weighKg),
        weighHash: ipfsResponse.ipfsHash,
        timestamp,
        nonce,
      });

      const signature = await signPayloadHashWithWallet(oracleAddress, payloadHash);

      const txHashResult = await writeContractAsync({
        abi: ShipmentTokenABI,
        address: contractAddresses.ShipmentToken,
        functionName: 'attachWeighment',
        args: [{
          shipmentId: shipment.shipmentIdOnChain as `0x${string}`,
          weighKg: BigInt(values.weighKg),
          weighHash: ipfsResponse.ipfsHash,
          timestamp,
          nonce,
          signature,
        }],
      });
      
      // ✅ FIXED: Store txHash in state so useWaitForTransactionReceipt hook can monitor it
      setTxHash(txHashResult);
      
      // ✅ FIXED: Update Firestore after successful transaction
      // The useWaitForTransactionReceipt hook will set isConfirmed when receipt is confirmed
      // But for now, optimistically update since transaction was submitted
      const proposalRef = doc(firestore, 'weighmentProposals', proposal.id);
      updateDocumentNonBlocking(proposalRef, { status: 'approved', txHash: txHashResult });

      const shipmentRef = doc(firestore, 'shipments', shipment.id);
      const newTimelineEvent = { 
        status: 'Delivered',  // ✅ FIXED: Track actual state change
        timestamp: new Date().toISOString(),
        details: `Weighment of ${values.weighKg}kg approved by Oracle. Tx: ${txHashResult.slice(0, 10)}...` 
      };
      updateDocumentNonBlocking(shipmentRef, { 
          weighments: [...(shipment.weighments || []), { weight: values.weighKg, timestamp: new Date().toISOString(), oracle: oracleAddress }],
          timeline: [...(shipment.timeline || []), newTimelineEvent]  // ✅ FIXED: Safe array access
      });

      toast({ title: 'Weighment Approved', description: 'Transaction submitted. Waiting for confirmation...' });
      setIsOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Approval Failed', description: e.message });
    }
  }
  
    async function handleReject() {
        try {
            const proposalRef = doc(firestore, 'weighmentProposals', proposal.id);
            await updateDocumentNonBlocking(proposalRef, { status: 'rejected' });
            toast({ title: 'Proposal Rejected', description: 'The weighment proposal has been marked as rejected.' });
            setIsOpen(false);
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Rejection Failed', description: e.message });
        }
    }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={proposal.status !== 'pending'}>
          {proposal.status === 'pending' ? 'Review' : `Status: ${proposal.status}`}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Weighment Proposal</DialogTitle>
          <DialogDescription>
            Review and approve/reject the weighment for shipment {shipment.id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <p><strong>Shipment Content:</strong> {shipment.content}</p>
            <p><strong>Proposed By:</strong> <span className="font-mono text-xs">{proposal.proposerAddress}</span></p>
            <p><strong>Proposed Weight:</strong> {proposal.proposedWeight} kg</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="weighKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmed Weight (in Kilograms)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between space-x-2 pt-4">
                <Button type="button" variant="destructive" onClick={handleReject} disabled={isTxPending || isConfirming}>
                    Reject Proposal
                </Button>
                <Button type="submit" className="w-full" disabled={isTxPending || isConfirming}>
                  {(isTxPending || isConfirming) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Approve & Submit On-Chain
                </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
