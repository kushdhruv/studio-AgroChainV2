

'use client';

import Image from 'next/image';
import type { Shipment, User as AppUser, Role } from '@/lib/types';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Handshake, Loader2, Package, ShieldAlert, Truck, User as UserIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { doc, getDoc, collection, query, where } from 'firebase/firestore';
import { updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useState,useEffect, useRef, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ShipmentTokenABI } from '@/contracts/ShipmentToken';
import { DisputeManagerABI } from '@/contracts/DisputeManager';
import { EscrowPaymentABI } from '@/contracts/EscrowPayment';
import { contractAddresses } from '@/contracts/addresses';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { uploadJsonToIPFS } from '@/lib/actions';
import { parseEther, decodeEventLog } from 'viem';
import { readContract, waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { getAddress } from 'ethers';


const statusColors: { [key in Shipment['status']]: string } = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    OfferMade: "bg-cyan-100 text-cyan-800 border-cyan-300",
    AwaitingPayment: "bg-orange-100 text-orange-800 border-orange-300",
    ReadyForPickup: "bg-blue-100 text-blue-800 border-blue-300",
    "In-Transit": "bg-indigo-100 text-indigo-800 border-indigo-300",
    Claimed: "bg-amber-100 text-amber-800 border-amber-300",
    Delivered: "bg-green-100 text-green-800 border-green-300",
    Verified: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Cancelled: "bg-red-100 text-red-800 border-red-300",
    Disputed: "bg-purple-100 text-purple-800 border-purple-300",
};

// NOTE: These MUST match the enum order in your smart contract
// ShipmentState { OPEN, ASSIGNED, IN_TRANSIT, DELIVERED, VERIFIED, PAID, DISPUTED, CANCELLED }
const onChainStatusMap: { [key in Shipment['status']]: number } = {
  Pending: 0,      // OPEN
  OfferMade: 1,    // ASSIGNED
  AwaitingPayment: 2,
  ReadyForPickup: 2,  // Both map to IN_TRANSIT (2)
  "In-Transit": 2,    // IN_TRANSIT
  Claimed: 3,
  Delivered: 3,       // DELIVERED
  Verified: 4,        // VERIFIED
  Cancelled: 7,       // CANCELLED
  Disputed: 6,        // DISPUTED
};

const timelineIcons: { [key: string]: React.ReactNode } = {
    Pending: <Package className="h-5 w-5" />,
    OfferMade: <Handshake className="h-5 w-5 text-cyan-500" />,
    AwaitingPayment: <Package className="h-5 w-5 text-orange-500" />,
    ReadyForPickup: <Package className="h-5 w-5 text-blue-500" />,
    "In-Transit": <Truck className="h-5 w-5 text-indigo-500" />,
    Delivered: <CheckCircle className="h-5 w-5 text-green-500" />,
    Claimed: <CheckCircle className="h-5 w-5 text-amber-500" />,
    Disputed: <ShieldAlert className="h-5 w-5 text-purple-500" />,
    default: <Package className="h-5 w-5" />,
};



function ShipmentTimeline({ timeline }: { timeline: Shipment['timeline'] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Shipment History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6">
                    <div className="absolute left-[34px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                    {timeline.map((event, index) => (
                        <div key={index} className="relative flex items-start gap-4 mb-6 last:mb-0">
                            <div className="absolute left-[34px] top-2.5 h-0.5 w-4 bg-border -translate-x-full"></div>
                            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                                {timelineIcons[event.status] || timelineIcons.default}
                            </div>
                            <div>
                                <p className="font-semibold">{event.status}</p>
                                <p className="text-sm text-muted-foreground">{event.details}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(event.timestamp).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function UserDetailsPopup({ userId, userRole }: { userId: string; userRole: Role }) {
    const firestore = useFirestore();
    const [user, setUser] = useState< AppUser | null>(null);

    const fetchUser = async () => {
        const userRef = doc(firestore, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            setUser(userSnap.data() as AppUser);
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={fetchUser}>
                    {userId}
                </Button>
            </DialogTrigger>
            <DialogContent>
                {user ? (
                    <>
                    <DialogHeader>
                        <DialogTitle className="font-headline">{user.name}</DialogTitle>
                        <DialogDescription>{user.role}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <p><strong>Email:</strong> {user.email}</p>
                        {user.role === 'Farmer' && user.details?.farm?.location && <p><strong>Location:</strong> {user.details.farm.location.district}, {user.details.farm.location.state}</p>}
                        {user.role === 'Industry' && user.details?.companyType && <p><strong>Company Type:</strong> {user.details.companyType}</p>}
                        {user.role === 'Transporter' && user.details?.vehicle && <p><strong>Vehicle:</strong> {user.details.vehicle.vehicleType}, {user.details.vehicle.registrationNumber}</p>}
                    </div>
                    </>
                ) : <p>Loading user details...</p>}
            </DialogContent>
        </Dialog>
    )
}

export function RaiseDisputeDialog({
  shipment,
  userProfile,
  onDisputeRaised,
}: {
  shipment: Shipment;
  userProfile: AppUser;
  onDisputeRaised: () => void;
}) {
  // --- STATE AND HOOKS ---
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [pendingDispute, setPendingDispute] = useState<{
    reason: string;
    evidenceHash: string;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [disputeId, setDisputeId] = useState<number>(-1); // State for the final ID
  
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { address: walletAddress } = useAccount();

  // --- WAGMI HOOKS ---
  // Hook to write to the contract
  const { 
    data: txHash, 
    isPending: isWritingContract, 
    writeContractAsync 
  } = useWriteContract();

  // Hook to wait for the transaction to be confirmed
  const { 
    data: receipt, 
    isLoading: isConfirming, 
    isSuccess: isTransactionSuccessful 
  } = useWaitForTransactionReceipt({ 
    hash: txHash,
    query: { 
      enabled: !!txHash // Only runs when txHash has a value
    } 
  });

  // This combines all loading states for the UI
  const isSubmitting = isUploading || isWritingContract || isConfirming;

  // --- EFFECT TO HANDLE TRANSACTION CONFIRMATION ---
  useEffect(() => {
    // This runs ONLY when the transaction is successful AND we have pending data
    if (isTransactionSuccessful && receipt && pendingDispute) {
      
      (async () => {
        // ✅ FIX: Add a guard clause for user and wallet
        // This stops the "'user' is possibly 'null'" error
        if (!user || !walletAddress) {
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'User or wallet disconnected during transaction.',
          });
          setPendingDispute(null); // Clear pending state
          return;
        }

        let foundDisputeId = -1; // Use a local variable
        try {
          // 3️⃣ Parse DisputeRaised event to get dispute ID
          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: DisputeManagerABI, // No 'as const' needed here
                data: log.data as `0x${string}`,
                topics: log.topics as any,
              });
              if (decoded.eventName === 'DisputeRaised' && decoded.args) {
                // ✅ FIX: Use '(decoded.args as any)' to bypass
                // TypeScript's "readonly unknown[]" error.
                foundDisputeId = Number((decoded.args as any).disputeId);
                break;
              }
            } catch (e) { /* Not the right event, continue */ }
          }

          if (foundDisputeId === -1) {
            throw new Error('Failed to extract dispute ID from transaction event.');
          }

          // 4️⃣ Firestore updates with actual dispute ID
          updateDocumentNonBlocking(doc(firestore, 'shipments', shipment.id), { status: 'Disputed' });

          setDocumentNonBlocking(doc(firestore, 'disputes', foundDisputeId.toString()), {
            disputeIdOnChain: foundDisputeId,
            shipmentId: shipment.id,
            shipmentIdOnChain: shipment.shipmentIdOnChain,
            raiserId: user.uid, // This is now safe
            raiserWallet: walletAddress, // This is now safe
            reason: pendingDispute.reason, // Use data from state
            status: 'Open',
            evidence: [
              {
                submitterId: user.uid, // This is now safe
                evidenceHash: pendingDispute.evidenceHash, // Use data from state
                timestamp: new Date().toISOString(),
              },
            ],
          });

          // 5️⃣ Success!
          setDisputeId(foundDisputeId); // Set the final ID to state
          onDisputeRaised();
          setIsOpen(false);
          toast({
            title: 'Dispute Successfully Raised!',
            description: `Dispute ID: ${foundDisputeId}`,
          });

        } catch (e: any) {
          toast({
            variant: 'destructive',
            title: 'Failed to Process Transaction',
            description: e.message,
          });
        } finally {
          // CRITICAL: Clear the pending state so this doesn't run again
          setPendingDispute(null);
        }
      })();
    }
  }, [
    isTransactionSuccessful, 
    receipt, 
    pendingDispute, 
    firestore, 
    shipment, 
    user, 
    walletAddress, 
    onDisputeRaised, 
    setIsOpen, 
    toast
  ]);

  // --- SUBMIT HANDLER ---
  const handleSubmitDispute = async () => {
    // This check already correctly handles the "'user' is null" error
    if (!reason) {
      toast({
        variant: 'destructive',
        title: 'Reason Required',
        description: 'Please provide a reason for the dispute.',
      });
      return;
    }
    if (!user || !walletAddress) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User or wallet not connected.',
      });
      return;
    }

    setIsUploading(true); // Use a separate state for IPFS upload
    setPendingDispute(null); // Reset pending state
    let evidenceHash = '';

    try {
      // 1️⃣ Upload evidence to IPFS
      const evidenceResponse = await uploadJsonToIPFS({
        raiser: user.uid,
        reason,
        timestamp: new Date().toISOString(),
      });

      if (!evidenceResponse.success || !evidenceResponse.ipfsHash) {
        throw new Error('Failed to upload evidence to IPFS.');
      }
      evidenceHash = evidenceResponse.ipfsHash;

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'IPFS Upload Failed', description: e.message });
      setIsUploading(false);
      return;
    }
    
    setIsUploading(false); // IPFS upload is done

    try {
      // Store data needed for the useEffect *before* sending tx
      setPendingDispute({ reason, evidenceHash });

      // 2️⃣ Trigger dispute smart contract
      await writeContractAsync({
        abi: DisputeManagerABI,
        address: contractAddresses.DisputeManager,
        functionName: 'raiseDispute',
        args: [shipment.shipmentIdOnChain as `0x${string}`, evidenceHash],
      });

      toast({
        title: 'Dispute Transaction Sent',
        description: 'Please confirm in your wallet. The dispute will be logged shortly.',
      });

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Dispute Failed', description: e.message });
      setPendingDispute(null); // Clear pending state on error
    }
    // We do NOT set isSubmitting(false) here. The useEffect will do that.
  };

  // --- JSX RETURN ---
  // (Your component's <Dialog>, <Input>, <Button>, etc. JSX goes here)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full md:w-auto"
          disabled={isSubmitting}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Raise Dispute
        </Button>
      </DialogTrigger>

      <DialogContent>
        {/* ✅ VisuallyHidden fallback title (Radix accessibility fix) */}
        <VisuallyHidden>
          <DialogTitle>Raise a Dispute</DialogTitle>
        </VisuallyHidden>

        <DialogHeader>
          <DialogTitle>
            Raise a Dispute for Shipment {shipment.id.slice(0, 8)}...
          </DialogTitle>
          <DialogDescription>
            Explain the issue below. This will be recorded on-chain and sent for review.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Textarea
            placeholder="Clearly describe the problem..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <Button
            onClick={handleSubmitDispute}
            className="w-full"
            disabled={isSubmitting}
          >
            {(isSubmitting) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit Dispute On-Chain'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransporterSelection({ onSelect }: { onSelect: (address: string) => void }) {
    const firestore = useFirestore();
    const transportersQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'users'), where('role', '==', 'Transporter'), where('kycVerified', '==', true));
    }, [firestore]);

    const { data: transporters, isLoading } = useCollection<AppUser>(transportersQuery);

    if (isLoading) {
        return <p>Loading transporters...</p>;
    }

    return (
        <Select onValueChange={onSelect}>
            <SelectTrigger>
                <SelectValue placeholder="Select a verified transporter" />
            </SelectTrigger>
            <SelectContent>
                {transporters?.map(t => (
                    <SelectItem key={t.uid} value={t.walletAddress || ''}>
                        {t.name} ({t.walletAddress?.slice(0, 6)}...{t.walletAddress?.slice(-4)})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}


export function ShipmentDetailsClient({ shipment, userProfile }: { shipment: Shipment; userProfile: AppUser | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { address: walletAddress, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [transporterAddress, setTransporterAddress] = useState('');
  const [approveTxHash, setApproveTxHash] = useState<string | undefined>(undefined);
  const [shouldAutoDeposit, setShouldAutoDeposit] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState<{
    shipmentIdOnChain?: string;
    tokenAddress?: `0x${string}`;
    amount?: bigint;
    farmer?: `0x${string}`;
    transporter?: `0x${string}`;
    farmerBps?: number;
    transporterBps?: number;
    platformBps?: number;
  } | null>(null);
  // UI-facing processing state to disable buttons while flow is active
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash as `0x${string}` | undefined });

  // Ref to avoid multiple auto-deposit executions
  const isAutoDepositRunningRef = useRef(false);

  

  const ipfsGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
  const imageUrl = shipment.imageUrl.startsWith('https://') ? shipment.imageUrl : `${ipfsGateway}/ipfs/${shipment.imageUrl}`;


  const handleActionWithVerification = (action: () => void) => {
    if (!userProfile?.kycVerified) {
      toast({
        variant: "destructive",
        title: "KYC Verification Required",
        description: "Please complete your profile to perform this action.",
      });
      router.push('/dashboard/profile');
      return;
    }
    if (!isConnected || !walletAddress) {
        toast({ variant: 'destructive', title: 'Wallet Not Connected' });
        return;
    }
    action();
  }

  const updateFirestoreStatus = useCallback((status: Shipment['status'], details: string, extraData: object = {}) => {
    if (!user) return;
    const shipmentRef = doc(firestore, 'shipments', shipment.id);
    const newTimelineEvent = { status, timestamp: new Date().toISOString(), details };

    updateDocumentNonBlocking(shipmentRef, {
        status,
        timeline: [...shipment.timeline, newTimelineEvent],
        ...extraData
    });
  }, [firestore, shipment, user]);

  // Ref guard to avoid re-entrancy / duplicate tx submissions
  const isProcessingPayRef = useRef(false);

  // When approval is confirmed, automatically execute the pending deposit (if any)
  useEffect(() => {
    if (!isApproveConfirmed || !shouldAutoDeposit || !pendingDeposit) return;
    if (isAutoDepositRunningRef.current) return; // already handling
    isAutoDepositRunningRef.current = true;
    setIsProcessingPay(true);

    (async () => {
      try {
        toast({ title: 'Approval Confirmed', description: 'Submitting escrow deposit...' });
        await writeContractAsync({
          abi: EscrowPaymentABI,
          address: contractAddresses.EscrowPayment,
          functionName: 'depositPayment',
          args: [
            pendingDeposit.shipmentIdOnChain as `0x${string}`,
            pendingDeposit.tokenAddress as `0x${string}`,
            pendingDeposit.amount as bigint,
            pendingDeposit.farmer as `0x${string}`,
            pendingDeposit.transporter as `0x${string}`,
            pendingDeposit.farmerBps as number,
            pendingDeposit.transporterBps as number,
            pendingDeposit.platformBps as number,
          ],
        });

        toast({ title: 'Escrow Deposited', description: 'Payment confirmed on-chain. Updating shipment state...' });

        // Update local Oracle pending state & Firestore similar to handlePayEscrow flow
        const pendingUpdate = {
          id: `${pendingDeposit.shipmentIdOnChain}-${Date.now()}`,
          shipmentId: shipment.id,
          shipmentIdOnChain: pendingDeposit.shipmentIdOnChain,
          currentState: 4,
          targetState: 5,
          status: 'pending' as const,
          createdAt: Date.now(),
          attemptCount: 0,
        };
        const existingUpdates = localStorage.getItem('pendingStateUpdates');
        const updates = existingUpdates ? JSON.parse(existingUpdates) : [];
        updates.push(pendingUpdate);
        localStorage.setItem('pendingStateUpdates', JSON.stringify(updates));

        try {
          const response = await fetch('/api/oracle/update-shipment-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipmentId: pendingDeposit.shipmentIdOnChain, toState: 5, timestamp: Math.floor(Date.now() / 1000), nonce: Date.now() }),
          });
          const oracleResponse = await response.json();
          if (!oracleResponse.success) console.warn('Oracle state update delayed:', oracleResponse.error);
        } catch (oracleError: any) {
          console.warn('Could not reach oracle service:', oracleError.message);
        }

        updateFirestoreStatus('ReadyForPickup', 'Escrow payment confirmed by Industry.');

      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Deposit Failed', description: e.message || String(e) });
      } finally {
        setApproveTxHash(undefined);
        setShouldAutoDeposit(false);
        setPendingDeposit(null);
        isAutoDepositRunningRef.current = false;
        setIsProcessingPay(false);
      }
    })();
  }, [isApproveConfirmed, shouldAutoDeposit, pendingDeposit, writeContractAsync, toast, shipment, updateFirestoreStatus]);

  const handleMakeOffer = () => handleActionWithVerification(async () => {
    if (!user || !walletAddress) return;
    try {
        await writeContractAsync({
            abi: ShipmentTokenABI,
            address: contractAddresses.ShipmentToken,
            functionName: 'setIndustry',
            args: [shipment.shipmentIdOnChain as `0x${string}`, walletAddress],
        });
        
        updateFirestoreStatus('OfferMade', `Offer made by Industry ${userProfile?.name}.`, { industryId: user.uid });
        toast({ title: "Offer Transaction Sent", description: `Please confirm in your wallet.` });
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Offer Failed', description: e.message });
    }
  });
  
  const handleAssignTransporter = () => handleActionWithVerification(async () => {
    if(!user || !transporterAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        toast({ variant: 'destructive', title: 'Invalid Address', description: 'Please select a valid transporter.' });
        return;
    };
    try {
        await writeContractAsync({
            abi: ShipmentTokenABI,
            address: contractAddresses.ShipmentToken,
            functionName: 'assignTransporter',
            args: [shipment.shipmentIdOnChain as `0x${string}`, transporterAddress as `0x${string}`],
        });
        
        // This is optimistic. A more robust solution would be to find the user with this wallet address.
        updateFirestoreStatus('AwaitingPayment', `Transporter agreed upon by Farmer and Industry.`, { transporterId: transporterAddress });
        toast({ title: "Transporter Assignment Sent", description: "Please confirm the transaction in your wallet." });
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
    }
  });
  
  const handleUpdateOnChainState = (newStatus: Shipment['status'], details: string) => handleActionWithVerification(async () => {
    if(!user) return;
    try {
      // Directly call updateShipmentState on-chain
      const stateEnum = onChainStatusMap[newStatus];
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = Date.now();
      // Signature is not required anymore, pass empty bytes
      await writeContractAsync({
        abi: ShipmentTokenABI,
        address: contractAddresses.ShipmentToken,
        functionName: 'updateShipmentState',
        args: [{
          shipmentId: shipment.shipmentIdOnChain as `0x${string}`,
          newState: stateEnum,
          timestamp,
          nonce,
          signature: '0x',
        }],
      });
      updateFirestoreStatus(newStatus, details);
      toast({ 
      title: "Status Updated", 
      description: `Shipment status changed to \"${newStatus}\" on-chain.` 
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Status Update Failed', description: e.message });
    }
  });

  const handlePayEscrow = () => handleActionWithVerification(async () => {
    // Prevent re-entrancy: bail out if a payment flow is already running
    if (isProcessingPayRef.current) {
      toast({ title: 'Already processing', description: 'Please confirm the pending transaction in your wallet.' });
      return;
    }
    isProcessingPayRef.current = true;
    if (!user || !userProfile?.walletAddress) {
        toast({ variant: 'destructive', title: 'User Error', description: 'Could not find user wallet.' });
        isProcessingPayRef.current = false;
        return;
    }

  try {
        const farmerSnap = await getDoc(doc(firestore, 'users', shipment.farmerId));
        if (!farmerSnap.exists() || !farmerSnap.data().walletAddress) {
            throw new Error("Could not find Farmer's wallet address.");
        }
        let farmerWalletAddress = farmerSnap.data().walletAddress;
        
        // Sanitize and format farmer wallet address
        farmerWalletAddress = farmerWalletAddress.trim();
        if (farmerWalletAddress.startsWith('0x')) {
            farmerWalletAddress = farmerWalletAddress.slice(2); // Remove 0x prefix for sanitization
        }
        // Remove any non-hex characters and keep only 40 chars
        farmerWalletAddress = farmerWalletAddress.replace(/[^a-fA-F0-9]/g, '').slice(0, 40);
        farmerWalletAddress = '0x' + farmerWalletAddress.toLowerCase();
        
        // Validate the address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(farmerWalletAddress)) {
            throw new Error(`Invalid farmer wallet address format: ${farmerWalletAddress} (length: ${farmerWalletAddress.length})`);
        }
        
        // Apply EIP-55 checksum formatting
        farmerWalletAddress = getAddress(farmerWalletAddress);
        
        // Also sanitize and format transporter address
        let transporterAddress = shipment.transporterId;
        if (!transporterAddress) {
            throw new Error("Transporter address not found in shipment.");
        }
        transporterAddress = transporterAddress.trim();
        if (transporterAddress.startsWith('0x')) {
            transporterAddress = transporterAddress.slice(2); // Remove 0x prefix for sanitization
        }
        // Remove any non-hex characters and keep only 40 chars
        transporterAddress = transporterAddress.replace(/[^a-fA-F0-9]/g, '').slice(0, 40);
        transporterAddress = '0x' + transporterAddress.toLowerCase();
        
        if (!/^0x[a-fA-F0-9]{40}$/.test(transporterAddress)) {
            throw new Error(`Invalid transporter wallet address format: ${transporterAddress} (length: ${transporterAddress.length})`);
        }
        
        // Apply EIP-55 checksum formatting
        transporterAddress = getAddress(transporterAddress);
        
    // Use Anvil token for escrow (amount in wei)
    const amount = parseEther(shipment.askPrice.toString());
    // Token address from process env or use default token address
    const tokenAddress = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || 
               "0xf09F5f4e36b6B7E7734CE288F8367e1Bb143E90bb") as `0x${string}`;

    // Minimal ERC20 ABI for allowance/approve (proper ABI format)
    const ERC20_ABI = [
      {
        type: 'function',
        name: 'approve',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable'
      },
      {
        type: 'function',
        name: 'allowance',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
      }
    ] as const;

        toast({ title: "Submitting Escrow Payment...", description: "Processing transaction..." });

        // ✅ STEP 0: Check allowance and approve if needed
        try {
          // Read current allowance of escrow contract for the connected wallet
          const allowance: bigint = await readContract(config, {
            abi: ERC20_ABI,
            address: tokenAddress,
            functionName: 'allowance',
            args: [walletAddress as `0x${string}`, contractAddresses.EscrowPayment as `0x${string}`],
          }) as bigint;

          if (allowance < amount) {
            toast({ title: 'Approval Required', description: 'Requesting token approval...' });
            const approveTxHash = await writeContractAsync({
              abi: ERC20_ABI,
              address: tokenAddress,
              functionName: 'approve',
              args: [contractAddresses.EscrowPayment as `0x${string}`, amount],
            }) as string;

            // Store pending deposit details and watch for approval confirmation in an effect
            setApproveTxHash(approveTxHash);
            setPendingDeposit({
              shipmentIdOnChain: shipment.shipmentIdOnChain,
              tokenAddress,
              amount,
              farmer: farmerWalletAddress as `0x${string}`,
              transporter: transporterAddress as `0x${string}`,
              farmerBps: 8000,
              transporterBps: 1500,
              platformBps: 500,
            });
            setShouldAutoDeposit(true);

            toast({ title: 'Approval Sent', description: 'Please confirm approval in your wallet. Deposit will proceed once approval is mined.' });
            return; // wait for approval effect to trigger deposit
          }
        } catch (e: any) {
          toast({ variant: 'destructive', title: 'Approval Failed', description: e.message || String(e) });
          throw e;
        }

        // ✅ STEP 1: Deposit Escrow Payment (allowance already sufficient)
        await writeContractAsync({
          abi: EscrowPaymentABI,
          address: contractAddresses.EscrowPayment,
          functionName: 'depositPayment',
          args: [
            shipment.shipmentIdOnChain as `0x${string}`,
            tokenAddress,
            amount,
            farmerWalletAddress as `0x${string}`,
            transporterAddress as `0x${string}`,
            8000, // 80% to farmer
            1500, // 15% to transporter
            500   // 5% to platform
          ],
        });

        toast({ title: "Escrow Deposited", description: "Payment confirmed on-chain. Updating shipment state..." });

    // ✅ STEP 2: Update Firestore Status
    updateFirestoreStatus('ReadyForPickup', 'Escrow payment confirmed by Industry.');
    // ✅ STEP 3: Update on-chain state to PAID
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Date.now();
    await writeContractAsync({
      abi: ShipmentTokenABI,
      address: contractAddresses.ShipmentToken,
      functionName: 'updateShipmentState',
      args: [{
        shipmentId: shipment.shipmentIdOnChain as `0x${string}`,
        newState: 5, // PAID
        timestamp,
        nonce,
        signature: '0x',
      }],
    });
    toast({ title: "✅ Escrow Payment Complete", description: "Shipment is now ReadyForPickup and PAID on-chain." });

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Escrow Payment Failed', description: e.message });
    }
    finally {
      // Always clear the processing guard so user can retry after failure/success
      isProcessingPayRef.current = false;
    }
  });

  const handleConfirmPickup = () => {
    handleUpdateOnChainState('In-Transit', 'Shipment picked up by transporter.');
  };
  
  const handleMarkAsDelivered = () => {
    handleUpdateOnChainState('Delivered', 'Shipment marked as delivered by transporter.');
  };

  const handleVerifyShipment = () => {
    handleUpdateOnChainState('Verified', 'Shipment verified by Industry. Ready for payment release.');
  };

  const handleReleasePayment = () => handleActionWithVerification(async () => {
    if(!user) return;
    try {
        // Add validation and debugging info
        console.log('🔍 Release Payment Debug Info:', {
          shipmentId: shipment.id,
          shipmentIdOnChain: shipment.shipmentIdOnChain,
          farmerId: shipment.farmerId,
          currentUserId: user.uid,
          isFarmer: user.uid === shipment.farmerId,
          shipmentStatus: shipment.status,
        });

        // Verify user is the farmer
        if (user.uid !== shipment.farmerId) {
          throw new Error('Only the Farmer can claim payment for this shipment.');
        }

        // Check shipment status
        if (shipment.status !== 'Verified') {
          throw new Error(`Shipment must be in "Verified" status to claim payment. Current status: ${shipment.status}. Industry must verify the shipment first.`);
        }

        // Check if shipment is verified on-chain
        const isVerified = await readContract(config, {
          abi: ShipmentTokenABI,
          address: contractAddresses.ShipmentToken,
          functionName: 'isShipmentVerified',
          args: [shipment.shipmentIdOnChain as `0x${string}`],
        }) as boolean;

        if (!isVerified) {
          console.warn('⚠️ Shipment is not verified on-chain yet. This may cause issues with payment release.');
          // Continue anyway - manager or farmer can still release after verification
        }

        // Read the escrow state on-chain to verify it exists and is in releasable status
        const escrowData = await readContract(config, {
          abi: EscrowPaymentABI,
          address: contractAddresses.EscrowPayment,
          functionName: 'getEscrow',
          args: [shipment.shipmentIdOnChain as `0x${string}`],
        }) as any;

        console.log('📋 Escrow State on-chain:', {
          amount: escrowData?.amount?.toString(),
          status: escrowData?.status,
          farmer: escrowData?.farmer,
          transporter: escrowData?.transporter,
        });

        if (!escrowData || escrowData.amount === BigInt(0)) {
          throw new Error('No escrow found for this shipment on-chain.');
        }

        // Status 0 = DEPOSITED, 1 = HELD, 2 = RELEASED, 3 = REFUNDED
        const EscrowStatus = { DEPOSITED: 0, HELD: 1, RELEASED: 2, REFUNDED: 3 };
        if (escrowData.status !== EscrowStatus.DEPOSITED && escrowData.status !== EscrowStatus.HELD) {
          throw new Error(`Escrow is not in releasable status. Current status: ${escrowData.status}. Only DEPOSITED (0) or HELD (1) escrows can be released.`);
        }

        toast({ title: 'Claiming Payment...', description: 'Sending release transaction to blockchain...' });

        const txHash = await writeContractAsync({
            abi: EscrowPaymentABI,
            address: contractAddresses.EscrowPayment,
            functionName: 'releasePayment',
            args: [shipment.shipmentIdOnChain as `0x${string}`],
        });

        toast({ title: 'Transaction Sent', description: 'Waiting for confirmation...' });

        // Wait for transaction receipt
        const receipt = await waitForTransactionReceipt(config, { hash: txHash });

        if (receipt.status !== 'success') {
             throw new Error('Transaction failed on-chain.');
        }

        // Optionally record the on-chain release timestamp, but keep status as 'Claimed'
        const releasedAt = new Date().toISOString();
        updateFirestoreStatus('Claimed', 'Payment released on-chain.', { releasedAt });

        toast({ 
          title: '✅ Payment Released Successfully!', 
          description: 'Funds have been transferred to Farmer, Transporter, and Platform.' 
        });

    } catch(e: any) {
        console.error('❌ Payment Release Error:', e);
        toast({ variant: 'destructive', title: 'Payment Release Failed', description: e.message });
    }
  });

  const isAfterOfferMade = (status: Shipment['status']) => ['OfferMade', 'AwaitingPayment', 'ReadyForPickup', 'In-Transit', 'Delivered', 'Disputed'].includes(status);
  const isAfterTransporterAssigned = (status: Shipment['status']) => ['AwaitingPayment', 'ReadyForPickup', 'In-Transit', 'Delivered', 'Disputed'].includes(status);

  const canViewFarmerDetails = (userProfile?.role === 'Industry' || userProfile?.role === 'Transporter') && isAfterOfferMade(shipment.status);
  const canViewIndustryDetails = (userProfile?.role === 'Farmer' || userProfile?.role === 'Transporter') && isAfterOfferMade(shipment.status);
  const canViewTransporterDetails = (userProfile?.role === 'Farmer' || userProfile?.role === 'Industry') && isAfterTransporterAssigned(shipment.status);

  const renderActions = () => {
    if (!userProfile) return null;
    
    if (!userProfile.kycVerified) {
       return (
         <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
                You must complete your profile (KYC) to interact with shipments.
                <Button variant="link" className="p-0 h-auto ml-1" onClick={() => router.push('/dashboard/profile')}>
                Complete Profile
                </Button>
            </AlertDescription>
         </Alert>
       )
    }

    switch (userProfile.role) {
        case 'Industry':
            if (shipment.status === 'Pending') {
                return <Button onClick={handleMakeOffer} className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Make Offer
                </Button>;
            }
            if (shipment.status === 'OfferMade') {
                return (
                    <div className="flex flex-col sm:flex-row gap-2">
                        <TransporterSelection onSelect={setTransporterAddress} />
                        <Button onClick={handleAssignTransporter} className="w-full sm:w-auto" disabled={isPending || !transporterAddress}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Agree on Transporter
                        </Button>
                    </div>
                );
            }
      if (shipment.status === 'AwaitingPayment' && user?.uid === shipment.industryId) {
        return <Button onClick={handlePayEscrow} className="w-full md:w-auto" disabled={isPending || isProcessingPay}>
          {(isPending || isProcessingPay) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Pay Escrow ({shipment.askPrice.toLocaleString()} AGT)
        </Button>;
            }
            if (shipment.status === 'Delivered' && user?.uid === shipment.industryId) {
                return <Button onClick={handleVerifyShipment} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Verify Shipment
                </Button>;
            }
            break;
        case 'Transporter':
            if (shipment.status === 'ReadyForPickup' && walletAddress?.toLowerCase() === shipment.transporterId?.toLowerCase()) {
                return <Button onClick={handleConfirmPickup} className="w-full md:w-auto" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Confirm Pickup
                </Button>;
            }
            if (shipment.status === 'In-Transit' && walletAddress?.toLowerCase() === shipment.transporterId?.toLowerCase()) {
                return <Button onClick={handleMarkAsDelivered} className="w-full md:w-auto" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Mark as Delivered
                </Button>;
            }
            break;
        case 'Farmer':
             if (shipment.status === 'OfferMade' && user?.uid === shipment.farmerId) {
                return (
                     <div className="flex flex-col sm:flex-row gap-2">
                        <TransporterSelection onSelect={setTransporterAddress} />
                        <Button onClick={handleAssignTransporter} className="w-full sm:w-auto" disabled={isPending || !transporterAddress}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Agree on Transporter
                        </Button>
                    </div>
                );
            }
             if (shipment.status === 'Verified' && user?.uid === shipment.farmerId) {
                return <Button onClick={handleReleasePayment} className="w-full md:w-auto bg-green-600 hover:bg-green-700" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Claim Payment
                </Button>;
            }
            break;
        default:
            return null;
    }

    if (shipment.status !== 'Pending' && shipment.status !== 'Cancelled' && shipment.status !== 'Verified') {
        return <RaiseDisputeDialog shipment={shipment} userProfile={userProfile} onDisputeRaised={() => {
            // Optimistically update the local status
            shipment.status = 'Disputed';
            updateFirestoreStatus('Disputed', 'Dispute raised by ' + userProfile.name);
        }} />;
    }

    return null;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="font-headline text-2xl">{shipment.content} - {shipment.quantity}</CardTitle>
                    <CardDescription>From {shipment.farmerName}</CardDescription>
                </div>
                <Badge className={statusColors[shipment.status]}>{shipment.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
                <Image src={imageUrl} alt={shipment.content} fill className="object-contain" data-ai-hint={shipment.imageHint} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Origin</p><p className="font-semibold">{shipment.origin}</p></div>
                {shipment.destination && <div><p className="text-muted-foreground">Destination</p><p className="font-semibold">{shipment.destination}</p></div>}
                <div><p className="text-muted-foreground">Asking Price</p><p className="font-semibold">{shipment.askPrice.toLocaleString()} AGT</p></div>
                
                <div>
                    <p className="text-muted-foreground">Farmer ID</p>
                    {canViewFarmerDetails || user?.uid === shipment.farmerId ? <UserDetailsPopup userId={shipment.farmerId} userRole='Farmer' /> : <p className="font-mono text-xs">{shipment.farmerId}</p>}
                </div>
                
                {shipment.transporterId && (
                    <div>
                        <p className="text-muted-foreground">Transporter ID</p>
                        {canViewTransporterDetails || walletAddress?.toLowerCase() === shipment.transporterId.toLowerCase() ? <UserDetailsPopup userId={shipment.transporterId} userRole='Transporter' /> : <p className="font-mono text-xs">{shipment.transporterId}</p>}
                    </div>
                )}
                
                {shipment.industryId && (
                    <div>
                        <p className="text-muted-foreground">Industry ID</p>
                        {canViewIndustryDetails || user?.uid === shipment.industryId ? <UserDetailsPopup userId={shipment.industryId} userRole='Industry' /> : <p className="font-mono text-xs">{shipment.industryId}</p>}
                    </div>
                )}
                 <div>
                    <p className="text-muted-foreground">On-Chain ID</p>
                    <p className="font-mono text-xs break-all">{shipment.shipmentIdOnChain}</p>
                </div>
            </div>
            <Separator/>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1">
                  {renderActions()}
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <ShipmentTimeline timeline={shipment.timeline} />
      </div>
    </div>
  );
}
