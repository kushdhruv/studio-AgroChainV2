
'use client';

import { useState } from 'react';
import type { Dispute, Shipment, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useWriteContract } from 'wagmi';
import { DisputeManagerABI } from '@/contracts/DisputeManager';
import { contractAddresses } from '@/contracts/addresses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';

const statusColors: { [key in Dispute['status']]: string } = {
    Open: "bg-red-100 text-red-800 border-red-300",
    Resolved: "bg-green-100 text-green-800 border-green-300",
    Rejected: "bg-gray-100 text-gray-800 border-gray-300",
};

const resolutionMap = {
    REFUND_PAYER: 1,
    RELEASE_FUNDS: 2,
};

function ResolveDisputeForm({ dispute, onResolved }: { dispute: Dispute, onResolved: () => void }) {
    const { toast } = useToast();
    const { writeContractAsync, isPending } = useWriteContract();
    const [resolution, setResolution] = useState<'REFUND_PAYER' | 'RELEASE_FUNDS'>();
    const [note, setNote] = useState('');
    const firestore = useFirestore();

    const handleResolve = async () => {
        if (!resolution || !note) {
            toast({ variant: 'destructive', title: 'Missing information', description: 'Please select a resolution and provide a note.'});
            return;
        }

        try {
            const resolutionId = resolutionMap[resolution];

            await writeContractAsync({
                abi: DisputeManagerABI,
                address: contractAddresses.DisputeManager,
                functionName: 'resolveDispute',
                args: [BigInt(dispute.disputeIdOnChain), resolutionId, note],
            });

            const disputeRef = doc(firestore, 'disputes', dispute.id);
            updateDocumentNonBlocking(disputeRef, {
                status: 'Resolved',
                resolution,
                resolutionNote: note,
            });
            
            toast({ title: 'Dispute Resolution Sent', description: 'Please confirm the transaction in your wallet.'});
            onResolved();

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Resolution Failed', description: e.message });
        }
    }

    return (
        <Card className="bg-secondary">
            <CardHeader>
                <CardTitle className="font-headline">Resolve Dispute</CardTitle>
                <CardDescription>As an admin/resolver, you can resolve this dispute on-chain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Select onValueChange={(v) => setResolution(v as 'REFUND_PAYER' | 'RELEASE_FUNDS')}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Resolution" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="REFUND_PAYER">Refund Payer (Industry)</SelectItem>
                        <SelectItem value="RELEASE_FUNDS">Release Funds (to Farmer)</SelectItem>
                    </SelectContent>
                </Select>
                <Textarea
                    placeholder="Provide a detailed note explaining the resolution."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <Button onClick={handleResolve} disabled={isPending} className="w-full">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Resolve Dispute On-Chain
                </Button>
            </CardContent>
        </Card>
    )
}

export function DisputeDetailsClient({ dispute, shipment, userProfile }: { dispute: Dispute, shipment: Shipment, userProfile: AppUser }) {
    const ipfsGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
    
    // State to optimistically update UI
    const [currentDispute, setCurrentDispute] = useState(dispute);
    
    const canResolve = userProfile.role === 'Admin' && currentDispute.status === 'Open';

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                         <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="font-headline text-2xl">Dispute #{currentDispute.id.slice(0,8)}</CardTitle>
                                <CardDescription>
                                    Raised by wallet: 
                                    <span className="font-mono text-xs ml-2">{currentDispute.raiserWallet}</span>
                                </CardDescription>
                            </div>
                            <Badge className={statusColors[currentDispute.status]}>{currentDispute.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="font-semibold">Reason for Dispute</p>
                            <p className="text-muted-foreground">{currentDispute.reason}</p>
                        </div>

                         {currentDispute.status !== 'Open' && currentDispute.resolution && (
                            <Alert variant={currentDispute.resolution === 'RELEASE_FUNDS' ? 'default' : 'destructive'}>
                                <AlertTitle className="font-headline">Resolution: {currentDispute.resolution.replace('_', ' ')}</AlertTitle>
                                <AlertDescription>{currentDispute.resolutionNote}</AlertDescription>
                            </Alert>
                         )}

                    </CardContent>
                </Card>

                {canResolve && <ResolveDisputeForm dispute={currentDispute} onResolved={() => setCurrentDispute(prev => ({ ...prev, status: 'Resolved' }))} />}

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Evidence</CardTitle>
                        <CardDescription>All evidence submitted by participants is stored on IPFS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentDispute.evidence.map((e, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary">
                                <div>
                                    <p className="text-sm">Evidence #{i+1}</p>
                                    <p className="text-xs text-muted-foreground">Submitter: {e.submitterId.slice(0,10)}...</p>
                                </div>
                                <Button asChild variant="link">
                                    <a href={`${ipfsGateway}/ipfs/${e.evidenceHash}`} target="_blank" rel="noopener noreferrer">View on IPFS</a>
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Related Shipment</CardTitle>
                         <CardDescription>
                            <Link href={`/dashboard/shipments/${shipment.id}`} className="hover:underline text-accent">
                                View Full Shipment Details
                            </Link>
                         </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Shipment ID</p>
                            <p className="font-mono text-xs">{shipment.id}</p>
                        </div>
                         <div>
                            <p className="text-muted-foreground">Content</p>
                            <p>{shipment.content} - {shipment.quantity}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Route</p>
                            <p>{shipment.origin} to {shipment.destination || 'N/A'}</p>
                        </div>
                         <Separator />
                        <div>
                            <p className="text-muted-foreground">Farmer</p>
                            <p className="font-mono text-xs">{shipment.farmerId}</p>
                        </div>
                        {shipment.industryId && <div>
                            <p className="text-muted-foreground">Industry</p>
                            <p className="font-mono text-xs">{shipment.industryId}</p>
                        </div>}
                        {shipment.transporterId && <div>
                            <p className="text-muted-foreground">Transporter</p>
                            <p className="font-mono text-xs">{shipment.transporterId}</p>
                        </div>}
                    </CardContent>
                 </Card>
            </div>
        </div>
    );
}
