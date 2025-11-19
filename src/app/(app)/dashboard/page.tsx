'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, and } from 'firebase/firestore';
import { useAuthState } from '@/lib/auth-state';
import type { User as AppUser, Shipment, PendingApproval } from '@/lib/types';

const getShipmentsQuery = (firestore: any, user: AppUser) => {
  const shipmentsRef = collection(firestore, 'shipments');
  switch (user.role) {
    case 'Farmer':
      return query(shipmentsRef, where('farmerId', '==', user.uid));
    case 'Transporter':
      return user.walletAddress ? query(
        shipmentsRef,
        and(
          where('transporterId', '==', user.walletAddress),
          where('status', 'in', ['ReadyForPickup', 'In-Transit'])
        )
      ) : null;
    case 'Industry':
      return query(shipmentsRef, where('industryId', '==', user.uid));
    case 'Admin':
      return query(shipmentsRef);
    default:
      return null;
  }
}

export default function Dashboard() {
  const { user: userProfile } = useAuthState();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (userProfile?.role === 'Government') {
      router.replace('/dashboard/oversight');
    } else if (userProfile?.role === 'Oracle') {
      router.replace('/dashboard/oracle');
    }
  }, [userProfile, router]);

  const shipmentsQuery = useMemo(() =>
    userProfile ? getShipmentsQuery(firestore, userProfile) : null
  , [firestore, userProfile]);

  const pendingApprovalsQuery = useMemo(() =>
    userProfile?.role === 'Admin' ? collection(firestore, 'pendingApprovals') : null
  , [firestore, userProfile]);

  const { data: shipments, isLoading: areShipmentsLoading } = useCollection<Shipment>(shipmentsQuery);
  const { data: pendingApprovals, isLoading: areApprovalsLoading } = useCollection<PendingApproval>(pendingApprovalsQuery);
  
  const isPageLoading = areShipmentsLoading || areApprovalsLoading;

  if (!userProfile || userProfile.role === 'Government' || userProfile.role === 'Oracle' || isPageLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return <DashboardPage 
            user={userProfile} 
            shipments={shipments || []} 
            pendingApprovals={pendingApprovals || []}
        />;
}
