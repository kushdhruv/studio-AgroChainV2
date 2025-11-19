
'use client';

import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { User, PendingApproval } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { TrustedParticipantManager } from './TrustedParticipantManager';
import { useState, useMemo } from 'react';
import ContractStateViewer from './ContractStateViewer';

export function AdminDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const approvalsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'pendingApprovals'));
  }, [firestore]);

  // *** THE FIX: A single, unified query for all trusted roles ***
  const trustedUsersQuery = useMemoFirebase(() => {
    // Fetches all users that have a role of Government, Admin, or Oracle.
    return query(collection(firestore, 'users'), where('role', 'in', ['Government', 'Admin', 'Oracle']));
  }, [firestore]);

  const { data: approvals, isLoading: approvalsLoading } = useCollection<PendingApproval>(approvalsQuery);
  // *** THE FIX: Only one data hook is now needed ***
  const { data: trustedUsers, isLoading: trustedUsersLoading } = useCollection<User>(trustedUsersQuery);

  // The separate oraclesQuery, oracles data fetching, and manual merging have been removed.

  const handleApproval = (approval: PendingApproval, action: 'approve' | 'reject') => {
    const userProfileRef = doc(firestore, 'users', approval.userId);
    const approvalDocRef = doc(firestore, 'pendingApprovals', approval.id);
    setIsSubmitting(approval.id);

    if (action === 'approve') {
      updateDocumentNonBlocking(userProfileRef, { kycVerified: true });
      deleteDocumentNonBlocking(approvalDocRef);
      toast({ title: 'User Approved', description: `${approval.name} has been approved.` });
    } else { 
      deleteDocumentNonBlocking(approvalDocRef);
      toast({ title: 'User Rejected', description: `The request for ${approval.name} has been removed.` });
    }
    setIsSubmitting(null);
  };
  
  const isLoading = approvalsLoading || trustedUsersLoading;
  
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Card><CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Pending Self-Registrations</CardTitle>
          <CardDescription>Review and approve new Farmers, Transporters, and Industries.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>User Name</TableHead><TableHead>Role</TableHead><TableHead>Request Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {approvals && approvals.length > 0 ? approvals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.role}</TableCell>
                  <TableCell>{p.submittedAt ? new Date(p.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleApproval(p, 'approve')} disabled={isSubmitting === p.id}>
                      {isSubmitting === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                      <span className="sr-only">Approve</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleApproval(p, 'reject')}>
                      <X className="h-4 w-4" /><span className="sr-only">Reject</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">No pending approvals.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Registered Trusted Participants</CardTitle>
          <CardDescription>A list of all registered Government, Admin, and Oracle users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>User Name</TableHead><TableHead>Role</TableHead><TableHead>Email</TableHead><TableHead>Wallet Address</TableHead></TableRow></TableHeader>
            <TableBody>
              {trustedUsers && trustedUsers.length > 0 ? trustedUsers.map((u) => (
                // Using walletAddress as key because it's the unique document ID now
                <TableRow key={u.walletAddress}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="font-mono text-xs">{u.walletAddress}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">No trusted users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <TrustedParticipantManager />
      <ContractStateViewer />
    </div>
  );
}
