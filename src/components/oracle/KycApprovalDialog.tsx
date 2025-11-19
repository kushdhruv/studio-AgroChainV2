'use client';

import { useState } from 'react';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';
import { useWriteContract, useAccount, useSignTypedData } from 'wagmi';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { RegistrationABI } from '@/contracts/Registration';
import { contractAddresses } from '@/contracts/addresses';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { uploadJsonToIPFS } from '@/lib/actions';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { onChainRoleMap, REGISTRATION_CONTRACT_DOMAIN } from '@/lib/constants';

// NOTE: keccak256 and toUtf8Bytes are no longer needed here.

interface PendingApproval {
  id: string;
  userId: string;
  name: string;
  role: User['role'];
  date: string;
}

export function KycApprovalDialog({ approval }: { approval: PendingApproval }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();
  const { address: oracleAddress } = useAccount();
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();
  const { signTypedDataAsync, isPending: isSignaturePending } = useSignTypedData();

  const userToApproveRef = useMemoFirebase(() => doc(firestore, 'users', approval.userId), [firestore, approval.userId]);
  const { data: userToApprove, isLoading } = useDoc<User>(userToApproveRef);

  async function handleApprove() {
    if (!userToApprove || !userToApprove.walletAddress) {
      toast({ variant: 'destructive', title: 'Error', description: 'User data is missing or incomplete.' });
      return;
    }
    if (!oracleAddress) {
      toast({ variant: 'destructive', title: 'Oracle wallet not connected' });
      return;
    }

    setIsSubmitting(true);
    try {
      const userFullDetails = {
        firestoreId: userToApprove.uid,
        name: userToApprove.name,
        email: userToApprove.email,
        role: userToApprove.role,
        walletAddress: userToApprove.walletAddress,
        details: userToApprove.details,
      };

      const ipfsResponse = await uploadJsonToIPFS(userFullDetails);
      if (!ipfsResponse.success || !ipfsResponse.ipfsHash) {
        throw new Error(ipfsResponse.error || "Could not upload profile data to IPFS.");
      }
      
      // The contract expects the IPFS CID as a string, not a bytes32 hash.
      const metaDataHashString = ipfsResponse.ipfsHash;

      const roleId = onChainRoleMap[userToApprove.role];
      if (roleId === undefined) {
        throw new Error(`Invalid role for on-chain attestation: ${userToApprove.role}`);
      }

      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const nonce = BigInt(Date.now());

      const signature = await signTypedDataAsync({
          domain: REGISTRATION_CONTRACT_DOMAIN,
          types: {
              Attestation: [
                  { name: 'participant', type: 'address' },
                  { name: 'role', type: 'uint8' },
                  // **FIX: The type MUST be string to match the contract ABI**
                  { name: 'metaDataHash', type: 'string' },
                  { name: 'timestamp', type: 'uint256' },
                  { name: 'nonce', type: 'uint256' },
              ],
          },
          primaryType: 'Attestation',
          message: {
              participant: userToApprove.walletAddress as `0x${string}`,
              role: roleId,
              // **FIX: Use the raw IPFS CID string in the signed message**
              metaDataHash: metaDataHashString,
              timestamp: timestamp,
              nonce: nonce,
          },
      });

      await writeContractAsync({
        abi: RegistrationABI,
        address: contractAddresses.Registration,
        functionName: 'kycAttestation',
        args: [{
          participant: userToApprove.walletAddress as `0x${string}`,
          role: roleId,
          // **FIX: Pass the raw IPFS CID string to the contract**
          metaDataHash: metaDataHashString,
          timestamp: timestamp,
          nonce: nonce,
          signature: signature,
        }],
      });

      const userRef = doc(firestore, 'users', approval.userId);
      updateDocumentNonBlocking(userRef, { kycVerified: true });
      const approvalRef = doc(firestore, 'pendingApprovals', approval.id);
      deleteDocumentNonBlocking(approvalRef);

      toast({ title: 'KYC Attestation Sent', description: 'Please confirm the transaction in your wallet.' });
      setIsOpen(false);

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Approval Failed', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    setIsSubmitting(true);
     try {
        const approvalDocRef = doc(firestore, 'pendingApprovals', approval.id);
        deleteDocumentNonBlocking(approvalDocRef);
        toast({
            title: 'User Rejected',
            description: `The approval request for ${approval.name} has been removed.`,
        });
        setIsOpen(false);
     } catch(e: any) {
        toast({ variant: 'destructive', title: 'Rejection Failed', description: e.message });
     } finally {
        setIsSubmitting(false);
     }
  }

  const isActionPending = isTxPending || isSignaturePending || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Review & Approve</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>KYC Approval for {approval.name}</DialogTitle>
          <DialogDescription>Review the user's details and approve to verify them on-chain.</DialogDescription>
        </DialogHeader>

        {isLoading && <div className="py-4 text-center">Loading user details...</div>}

        {userToApprove && (
            <div className="py-4 space-y-2 text-sm max-h-[50vh] overflow-y-auto">
                <p><strong>Name:</strong> {userToApprove.name}</p>
                <p><strong>Email:</strong> {userToApprove.email}</p>
                <p><strong>Role:</strong> {userToApprove.role}</p>
                <p><strong>Wallet:</strong> <span className="font-mono text-xs">{userToApprove.walletAddress}</span></p>
                <hr className="my-2"/>
                <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(userToApprove.details, null, 2)}
                </pre>
            </div>
        )}

        {!userToApprove && !isLoading && (
             <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Could not load the user's details from Firestore.</AlertDescription>
            </Alert>
        )}

        <DialogFooter className="sm:justify-between">
           <Button type="button" variant="destructive" onClick={handleReject} disabled={isActionPending}>Reject</Button>
           <Button type="button" variant="default" onClick={handleApprove} disabled={isActionPending || !userToApprove}>
             {isActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
             Approve On-Chain
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
