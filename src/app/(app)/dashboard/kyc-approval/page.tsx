'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { GovernmentDashboard } from '@/components/government/GovernmentDashboard';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { PendingApproval, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function KYCApprovalPage() {
  const firestore = useFirestore();

  const approvalsQuery = useMemo(() => 
    query(collection(firestore, 'pendingApprovals'))
  , [firestore]);

  const { data: pendingApprovals, isLoading, error } = useCollection<PendingApproval>(approvalsQuery);

  // Transform the PendingApproval[] data into the User[] format expected by the dashboard
  const pendingUsers: User[] = useMemo(() => {
    if (!pendingApprovals) return [];
    return pendingApprovals.map(approval => ({
      approvalId: approval.id, // Pass the pending approval document ID
      uid: approval.userId,      // Map userId to uid
      name: approval.name,
      email: approval.email,
      role: approval.role,
      walletAddress: approval.walletAddress, // <-- FIX: Pass the wallet address
      details: approval.details,
      kycVerified: false,      // This is implicit for a pending user
    }));
  }, [pendingApprovals]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Pending KYC Approvals</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading users: {error.message}</div>;
  }

  return <GovernmentDashboard initialUsers={pendingUsers} />;
}

export default KYCApprovalPage;
    