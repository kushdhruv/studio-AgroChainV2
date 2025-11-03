'use client';

import { useMemo } from 'react';
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from '@/components/common/PageHeader';
import { OracleDashboard } from '@/components/oracle/OracleDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Shipment, User } from '@/lib/types';

interface PendingApproval {
  id: string;
  userId: string;
  name: string;
  role: User['role'];
  date: string;
}

export default function OracleDashboardPage() {
  const firestore = useFirestore();

  // ✅ Memoize Firestore queries properly so they don’t change every render
  const shipmentsQuery = useMemo(() => {
    const shipmentsRef = collection(firestore, 'shipments');
    return query(shipmentsRef, where('status', '==', 'In-Transit'));
  }, [firestore]);

  const approvalsQuery = useMemo(() => {
    const approvalsRef = collection(firestore, 'pendingApprovals');
    return query(approvalsRef);
  }, [firestore]);

  // ✅ Subscribe to Firestore collections
  const { data: shipmentsRaw, isLoading: shipmentsLoading } = useCollection<Shipment>(shipmentsQuery);
  const { data: approvalsRaw, isLoading: approvalsLoading } = useCollection<PendingApproval>(approvalsQuery);

  const isLoading = shipmentsLoading || approvalsLoading;

  // ✅ Sanitize data before passing to client (avoid circular refs or Sets)
  const shipments = JSON.parse(
    JSON.stringify(shipmentsRaw || [], (_, v) => (v instanceof Set ? [...v] : v))
  );
  const approvals = JSON.parse(
    JSON.stringify(approvalsRaw || [], (_, v) => (v instanceof Set ? [...v] : v))
  );

  // ✅ Loading UI
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-8 space-y-8">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // ✅ Render dashboard
  return (
    <div className="flex flex-col h-full">
      <PageHeader>
        <PageHeaderHeading>Oracle Console</PageHeaderHeading>
        <PageHeaderDescription>
          Approve KYC for new participants and attach real-world data to shipments.
        </PageHeaderDescription>
      </PageHeader>

      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <OracleDashboard shipments={shipments} pendingApprovals={approvals} />
      </div>
    </div>
  );
}
