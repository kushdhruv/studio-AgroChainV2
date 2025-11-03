
'use client';

import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Role } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { OracleManager } from './OracleManager';
import { TrustedParticipantManager } from './TrustedParticipantManager';
import { useState } from 'react';

interface PendingApproval {
  id: string;
  userId: string;
  name: string;
  role: Role;
  date: string;
}

export function AdminDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const approvalsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'pendingApprovals'));
  }, [firestore]);

  const { data: approvals, isLoading } = useCollection<PendingApproval>(approvalsQuery);

  const handleApproval = (approval: PendingApproval, action: 'approve' | 'reject') => {
    const userProfileRef = doc(firestore, 'users', approval.userId);
    const approvalDocRef = doc(firestore, 'pendingApprovals', approval.id);
    setIsSubmitting(approval.id);

    if (action === 'approve') {
      // With the new flow, the user is already registered on-chain with PENDING status.
      // The admin's action is to verify them, which is an off-chain action in this model.
      // A more advanced flow could have this call a `verifyKYC` function on-chain.
      updateDocumentNonBlocking(userProfileRef, { kycVerified: true });
      deleteDocumentNonBlocking(approvalDocRef);

      toast({
        title: 'User Approved',
        description: `${approval.name} has been approved and can now access the platform.`,
      });
    } else { // Reject action
      deleteDocumentNonBlocking(approvalDocRef);
      // Optional: Could also delete the user from auth and the users collection for a full cleanup.
      // For now, we just remove the approval request.
      toast({
        title: 'User Rejected',
        description: `The approval request for ${approval.name} has been removed.`,
      });
    }
     setIsSubmitting(null);
  };
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Pending Self-Registrations</CardTitle>
          <CardDescription>Review and approve new Farmers, Transporters, and Industries.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals && approvals.length > 0 ? approvals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.role}</TableCell>
                  <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-green-600 hover:text-green-700" 
                      onClick={() => handleApproval(p, 'approve')}
                      disabled={isSubmitting === p.id}
                    >
                      {isSubmitting === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                      <span className="sr-only">Approve</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleApproval(p, 'reject')}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Reject</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No pending approvals.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <TrustedParticipantManager />
      <OracleManager />
    </div>
  );
}
