
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Shipment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DatabaseZap } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useWriteContract, useAccount, useChainId } from 'wagmi';
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

export function AttachWeighmentDialog({ shipment }: { shipment: Shipment }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { address: oracleAddress } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { weighKg: 0 },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!oracleAddress) {
      toast({ variant: 'destructive', title: 'Oracle wallet not connected' });
      return;
    }
    try {
      if (!oracleAddress) {
        throw new Error('Oracle wallet address not available');
      }

      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const nonce = BigInt(Date.now());
      const weighmentDetails = {
        shipmentId: shipment.id,
        weight: values.weighKg,
        timestamp: Number(timestamp),
        nonce: Number(nonce),
        oracle: oracleAddress,
      };

      // 1. Upload weighment details to IPFS for the hash
      const ipfsResponse = await uploadJsonToIPFS(weighmentDetails);
      if (!ipfsResponse.success || !ipfsResponse.ipfsHash) {
        throw new Error(ipfsResponse.error || "Could not upload weighment data to IPFS.");
      }

      // 2. Generate payload hash (must match contract's keccak256 encoding)
      const payloadHash = generateWeighmentPayloadHash({
        chainId: BigInt(chainId),
        shipmentId: shipment.shipmentIdOnChain as `0x${string}`,
        weighKg: BigInt(values.weighKg),
        weighHash: ipfsResponse.ipfsHash,
        timestamp,
        nonce,
      });

      // 3. Request signature from oracle's wallet
      // IMPORTANT: In production, use a backend API for oracle signing
      // This shows the frontend flow using wallet signing
      const signature = await signPayloadHashWithWallet(oracleAddress, payloadHash);

      // 4. Call the smart contract with signed payload
      const txHash = await writeContractAsync({
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

      // 5. Wait for transaction confirmation
      // Note: getPublicClient() requires wagmi config, use usePublicClient hook if available
      // For now, use a simpler approach with public RPC
      const receipt = await fetch(`${process.env.NEXT_PUBLIC_CHAIN_RPC || 'http://127.0.0.1:8545'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: 1,
        }),
      }).then(res => res.json()).then(async (data) => {
        // Poll until receipt is available
        let receipt = data.result;
        let attempts = 0;
        while (!receipt && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          receipt = await fetch(`${process.env.NEXT_PUBLIC_CHAIN_RPC || 'http://127.0.0.1:8545'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getTransactionReceipt',
              params: [txHash],
              id: 1,
            }),
          }).then(res => res.json()).then(d => d.result);
          attempts++;
        }
        return receipt;
      });

      // 6. Only update Firestore after transaction succeeds
      if (receipt && receipt.status === '0x1') {
        const shipmentRef = doc(firestore, 'shipments', shipment.id);
        const newTimelineEvent = { 
          status: shipment.status,
          timestamp: new Date().toISOString(),
          details: `Weighment of ${values.weighKg}kg attached by Oracle. Transaction: ${txHash.slice(0, 10)}...` 
        };
        updateDocumentNonBlocking(shipmentRef, {
          timeline: [...shipment.timeline, newTimelineEvent]
        });
      } else {
        throw new Error('Transaction failed on blockchain');
      }


      toast({ title: 'Weighment Submitted', description: 'Transaction sent to attach weighment data.' });
      setIsOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DatabaseZap className="mr-2 h-4 w-4" />
          Attach Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach Weighment Data</DialogTitle>
          <DialogDescription>
            Submit a verified weighment for shipment {shipment.id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="weighKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (in Kilograms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Weighment On-Chain
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
