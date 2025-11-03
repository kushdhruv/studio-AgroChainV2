

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
import { useState,useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ShipmentTokenABI } from '@/contracts/ShipmentToken';
import { DisputeManagerABI } from '@/contracts/DisputeManager';
import { EscrowPaymentABI } from '@/contracts/EscrowPayment';
import { contractAddresses } from '@/contracts/addresses';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { uploadJsonToIPFS } from '@/lib/actions';
import { parseEther, decodeEventLog } from 'viem';
import { getPublicClient } from '@wagmi/core';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
//import { config } from '@/components/blockchain/WagmiProvider';

const statusColors: { [key in Shipment['status']]: string } = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    OfferMade: "bg-cyan-100 text-cyan-800 border-cyan-300",
    AwaitingPayment: "bg-orange-100 text-orange-800 border-orange-300",
    ReadyForPickup: "bg-blue-100 text-blue-800 border-blue-300",
    "In-Transit": "bg-indigo-100 text-indigo-800 border-indigo-300",
    Delivered: "bg-green-100 text-green-800 border-green-300",
    Cancelled: "bg-red-100 text-red-800 border-red-300",
    Disputed: "bg-purple-100 text-purple-800 border-purple-300",
};

// NOTE: These MUST match the enum order in your smart contract
const onChainStatusMap: { [key in Shipment['status']]: number } = {
  Pending: 0,
  OfferMade: 1, // Or a more specific status like 'Accepted'
  AwaitingPayment: 2,
  ReadyForPickup: 3,
  "In-Transit": 4,
  Delivered: 5,
  Cancelled: 6,
  Disputed: 7,
};

const timelineIcons: { [key: string]: React.ReactNode } = {
    Pending: <Package className="h-5 w-5" />,
    OfferMade: <Handshake className="h-5 w-5 text-cyan-500" />,
    AwaitingPayment: <Package className="h-5 w-5 text-orange-500" />,
    ReadyForPickup: <Package className="h-5 w-5 text-blue-500" />,
    "In-Transit": <Truck className="h-5 w-5 text-indigo-500" />,
    Delivered: <CheckCircle className="h-5 w-5 text-green-500" />,
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

  const updateFirestoreStatus = (status: Shipment['status'], details: string, extraData: object = {}) => {
    if (!user) return;
    const shipmentRef = doc(firestore, 'shipments', shipment.id);
    const newTimelineEvent = { status, timestamp: new Date().toISOString(), details };
    
    updateDocumentNonBlocking(shipmentRef, {
        status,
        timeline: [...shipment.timeline, newTimelineEvent],
        ...extraData
    });
  }

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
          const newState = onChainStatusMap[newStatus];
          const timestamp = Math.floor(Date.now() / 1000);
          const nonce = Date.now(); // Simple nonce for this example
          const signature = "0x"; // Placeholder for a real oracle signature

          await writeContractAsync({
              abi: ShipmentTokenABI,
              address: contractAddresses.ShipmentToken,
              functionName: 'updateShipmentState',
              args: [{
                  shipmentId: shipment.shipmentIdOnChain as `0x${string}`,
                  newState,
                  timestamp,
                  nonce,
                  signature
              }],
          });
          
          updateFirestoreStatus(newStatus, details);
          toast({ title: "Status Update Sent", description: "Please confirm the transaction in your wallet." });
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Status Update Failed', description: e.message });
      }
  });

  const handlePayEscrow = () => handleActionWithVerification(async () => {
    if (!user || !userProfile?.walletAddress) {
        toast({ variant: 'destructive', title: 'User Error', description: 'Could not find user wallet.' });
        return;
    }
    const farmerQuery = query(collection(firestore, 'users'), where('uid', '==', shipment.farmerId));
    const transporterQuery = query(collection(firestore, 'users'), where('walletAddress', '==', shipment.transporterId));

    try {
        const farmerSnap = await getDoc(doc(firestore, 'users', shipment.farmerId));
        if (!farmerSnap.exists() || !farmerSnap.data().walletAddress) {
            throw new Error("Could not find Farmer's wallet address.");
        }
        const farmerWalletAddress = farmerSnap.data().walletAddress;
        
        // Note: For a token-based system, the user would first need to `approve` the escrow contract.
        // We are simulating that step and directly calling `depositPayment`.
        const amount = parseEther(shipment.askPrice.toString());
        const mockTokenAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // Placeholder for demo

        await writeContractAsync({
            abi: EscrowPaymentABI,
            address: contractAddresses.EscrowPayment,
            functionName: 'depositPayment',
            args: [
                shipment.shipmentIdOnChain as `0x${string}`,
                mockTokenAddress, // Mock Token Address
                amount,
                farmerWalletAddress,
                shipment.transporterId as `0x${string}`,
                8000, // 80% to farmer
                1500, // 15% to transporter
                500   // 5% to platform
            ],
        });

        updateFirestoreStatus('ReadyForPickup', 'Escrow payment confirmed by Industry.');
        toast({ title: "Escrow Payment Sent", description: "Please confirm transaction in your wallet." });

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Escrow Payment Failed', description: e.message });
    }
  });

  const handleConfirmPickup = () => {
    handleUpdateOnChainState('In-Transit', 'Shipment picked up by transporter.');
  };
  
  const handleMarkAsDelivered = () => {
    handleUpdateOnChainState('Delivered', 'Shipment marked as delivered by Industry.');
  };

  const handleReleasePayment = () => handleActionWithVerification(async () => {
    if(!user) return;
    try {
        await writeContractAsync({
            abi: EscrowPaymentABI,
            address: contractAddresses.EscrowPayment,
            functionName: 'releasePayment',
            args: [shipment.shipmentIdOnChain as `0x${string}`],
        });
        updateFirestoreStatus('Delivered', 'Payment released to Farmer.');
        toast({ title: 'Payment Release Sent', description: 'Please confirm transaction in your wallet.' });
    } catch(e: any) {
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
                return <Button onClick={handlePayEscrow} className="w-full md:w-auto" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Pay Escrow (₹{shipment.askPrice.toLocaleString()})
                </Button>;
            }
             if (shipment.status === 'In-Transit' && user?.uid === shipment.industryId) {
                return <Button onClick={handleMarkAsDelivered} className="w-full md:w-auto" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Mark as Delivered
                </Button>;
            }
            break;
        case 'Transporter':
            if (shipment.status === 'ReadyForPickup' && walletAddress?.toLowerCase() === shipment.transporterId?.toLowerCase()) {
                return <Button onClick={handleConfirmPickup} className="w-full md:w-auto" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Confirm Pickup
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
             if (shipment.status === 'Delivered' && user?.uid === shipment.farmerId) {
                return <Button onClick={handleReleasePayment} className="w-full md:w-auto" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Claim Payment
                </Button>;
            }
            break;
        default:
            return null;
    }

    if (shipment.status !== 'Pending' && shipment.status !== 'Cancelled' && shipment.status !== 'Delivered') {
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
                <div><p className="text-muted-foreground">Asking Price</p><p className="font-semibold">₹{shipment.askPrice.toLocaleString()}</p></div>
                
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
