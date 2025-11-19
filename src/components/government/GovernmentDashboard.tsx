'use client';

import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSignMessage } from 'wagmi';
import { getContractAddress } from '@/contracts/addresses';
import { RegistrationABI } from '@/contracts/Registration';
import toast from 'react-hot-toast';
import { User } from '@/lib/types';
import { doc, writeBatch } from 'firebase/firestore';
import { useDoc, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { generateKycAttestationPayloadHash } from '@/lib/oracle-signature';
import { KycAttestationSignatureParams } from '@/lib/oracle-signature';
import { uploadJsonToIPFS } from '@/lib/actions';

const roleToUint8: { [key: string]: number } = {
  FARMER: 1,
  TRANSPORTER: 2,
  INDUSTRY: 3,
  GOVT_AUTHORITY: 4,
  ADMIN: 5,
  ORACLE: 6,
};

interface GovernmentDashboardProps {
  initialUsers: User[];
}

export const GovernmentDashboard: FC<GovernmentDashboardProps> = ({ initialUsers }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [userToApprove, setUserToApprove] = useState<User | null>(null);
  const [attestationParams, setAttestationParams] = useState<Omit<KycAttestationSignatureParams, 'signature'> | null>(null);
  const [viewingUid, setViewingUid] = useState<string | null>(null);
  const { address: approverAddress, chainId } = useAccount();
  const firestore = useFirestore();

  const { data: txHash, isPending: isTxPending, writeContract, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const { data: signature, isPending: isSignaturePending, signMessage, reset: resetSignMessage } = useSignMessage();

  const handleApproveClick = (user: User) => {
    if (!approverAddress || !chainId) {
      toast.error('Wallet not connected or chain ID not found.');
      return;
    }
    
    // CRITICAL FIX: Validate that the user has a wallet address before proceeding.
    if (!user.walletAddress) {
      toast.error(`Error: User ${user.name} does not have a wallet address assigned and cannot be approved.`);
      return;
    }

    const registrationContractAddress = getContractAddress('Registration');
    if (!registrationContractAddress) {
      toast.error('Registration contract address not found.');
      return;
    }
    const roleAsUint8 = roleToUint8[user.role.toUpperCase()];
    if (roleAsUint8 === undefined) {
      toast.error(`Invalid role for user: ${user.role}`);
      return;
    }

    // Upload user data to IPFS and use the returned CID as the metaDataHash
    (async () => {
      toast.loading('Uploading user data to IPFS...', { id: `upload-${user.uid}` });
      const payload = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        phone: (user as any).phone || (user as any).mobile || null,
        role: user.role,
        walletAddress: user.walletAddress,
        details: user.details,
        registeredAt: (user as any).registeredAt || null,
      };

      const ipfsResult = await uploadJsonToIPFS(payload);
      if (!ipfsResult || !ipfsResult.success || !ipfsResult.ipfsHash) {
        toast.error('Failed to upload KYC data to IPFS. Approval halted.', { id: `upload-${user.uid}` });
        console.error('IPFS upload failed:', ipfsResult);
        return;
      }

      const ipfsCid = ipfsResult.ipfsHash;
      const ipfsUri = `ipfs://${ipfsCid}`;

      const paramsForSigning = {
        chainId: BigInt(chainId!),
        // CRITICAL FIX: Use the user's walletAddress for on-chain operations, not their UID.
        participant: user.walletAddress as `0x${string}`,
        role: roleAsUint8,
        metaDataHash: ipfsUri,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        nonce: BigInt(Date.now()), // More robust nonce
      };

      setUserToApprove(user);
      // store the uploaded CID so we can persist it to Firestore after confirmation
      setAttestationParams(paramsForSigning);
      (user as any)._uploadedMetaUri = ipfsUri;

      toast.success('KYC data uploaded to IPFS. Please sign to approve.', { id: `upload-${user.uid}` });

      const payloadHash = generateKycAttestationPayloadHash(paramsForSigning);
      signMessage({ message: { raw: payloadHash } });
    })();
  };

  useEffect(() => {
    if (signature && attestationParams && userToApprove) {
      const registrationContractAddress = getContractAddress('Registration');
      const finalParams = { ...attestationParams, signature };

      writeContract({
        address: registrationContractAddress as `0x${string}`,
        abi: RegistrationABI,
        functionName: 'kycAttestation',
        args: [finalParams],
      });

      toast.loading('Signature received. Sending approval transaction...', { id: `approval-${userToApprove.uid}` });
    }
  }, [signature, attestationParams, userToApprove, writeContract]);

  useEffect(() => {
    const handleDatabaseUpdate = async () => {
      if (isConfirmed && userToApprove) {
        const toastId = `approval-${userToApprove.uid}`;
        if (!userToApprove.approvalId) {
          toast.error('Critical Error: Approval ID missing. Cannot complete process.', { id: toastId });
          console.error("approvalId is missing, cannot delete from pendingApprovals", userToApprove);
          setUserToApprove(null);
          setAttestationParams(null);
          resetSignMessage();
          resetWriteContract();
          return;
        }

        toast.loading('Transaction confirmed. Updating database...', { id: toastId });

        try {
          const batch = writeBatch(firestore);
          const userRef = doc(firestore, 'users', userToApprove.uid);
          // Prefer the uploaded IPFS URI if available, otherwise fallback to previous inline JSON
          const uploadedMetaUri = (userToApprove as any)._uploadedMetaUri || null;
          const metadataHashValue = uploadedMetaUri || JSON.stringify(userToApprove.details);
          batch.update(userRef, { kycVerified: true, metadataHash: metadataHashValue });
          const approvalRef = doc(firestore, 'pendingApprovals', userToApprove.approvalId);
          batch.delete(approvalRef);
          await batch.commit();

          toast.success('User approved and database updated!', { id: toastId });
          setUsers(prevUsers => prevUsers.filter(u => u.uid !== userToApprove.uid));
        } catch (err) {
          toast.error('On-chain approval succeeded, but the database update failed.', { id: toastId });
          console.error('Firestore batch commit failed:', err);
        } finally {
          setUserToApprove(null);
          setAttestationParams(null);
          resetSignMessage();
          resetWriteContract();
        }
      }
    };

    handleDatabaseUpdate();
  }, [isConfirmed, userToApprove, firestore, resetSignMessage, resetWriteContract]);

  const isProcessing = (uid: string) => {
    return (userToApprove?.uid === uid) && (isSignaturePending || isTxPending || isConfirming);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Pending KYC Approvals</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.length > 0 ? (
          users.map((user) => (
            <div key={user.uid} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-2">{user.name}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Email: {user.email}</p>
              <p className="text-sm text-gray-500">Role: {user.role}</p>
              <div className="flex justify-end mt-4 space-x-2">
                <Button variant="outline" size="sm" onClick={() => setViewingUid(user.uid)}>View Details</Button>
                <Button onClick={() => handleApproveClick(user)} disabled={isProcessing(user.uid)}>
                  {isProcessing(user.uid) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSignaturePending && userToApprove?.uid === user.uid ? 'Check Wallet' : 'Approve KYC'}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center col-span-full">No pending KYC approvals.</p>
        )}
      </div>

      {viewingUid && (
        <ViewDetailsDialog uid={viewingUid} onClose={() => setViewingUid(null)} />
      )}
    </div>
  );
};

function ViewDetailsDialog({ uid, onClose }: { uid: string; onClose: () => void }) {
  const firestore = useFirestore();
  const userRef = useMemoFirebase(() => doc(firestore, 'users', uid), [firestore, uid]);
  const { data: user, isLoading } = useDoc<any>(userRef);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        {isLoading && <div className="py-4 text-center">Loading user details...</div>}

        {user && (
          <div className="py-4 space-y-2 text-sm max-h-[60vh] overflow-y-auto">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Phone:</strong> {(user.phone || user.mobile) ?? 'N/A'}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Wallet:</strong> <span className="font-mono text-xs">{user.walletAddress}</span></p>
            <hr className="my-2" />
            <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap">{JSON.stringify(user.details, null, 2)}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="default" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
