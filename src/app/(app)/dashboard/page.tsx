'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, and } from 'firebase/firestore';
import { useAuthState } from '@/lib/auth-state';
import type { User as AppUser, Shipment, PendingApproval } from '@/lib/types';

import { getAddress } from 'ethers';

const getShipmentsQuery = (firestore: any, user: AppUser) => {
  const shipmentsRef = collection(firestore, 'shipments');
  switch (user.role) {
    case 'Farmer':
      return query(shipmentsRef, where('farmerId', '==', user.uid));
    case 'Transporter':
      if (!user.walletAddress) return null;
      const lower = user.walletAddress.toLowerCase();
      let checksummed = lower;
      try {
        checksummed = getAddress(lower);
      } catch (e) {
        console.warn('Invalid wallet address for checksum:', lower);
      }
      // Query for both to be safe against inconsistent data storage
      return query(
        shipmentsRef,
        where('transporterId', 'in', [lower, checksummed])
      );
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
    if (userProfile?.role === 'Oracle') {
      router.replace('/dashboard/oracle');
    }
  }, [userProfile, router]);

  const shipmentsQuery = useMemo(() =>
    userProfile ? getShipmentsQuery(firestore, userProfile) : null
  , [firestore, userProfile]);

  const pendingApprovalsQuery = useMemo(() =>
    userProfile?.role === 'Admin' || userProfile?.role === 'Government' ? collection(firestore, 'pendingApprovals') : null
  , [firestore, userProfile]);

  const { data: shipments, isLoading: areShipmentsLoading } = useCollection<Shipment>(shipmentsQuery);
  const { data: pendingApprovals, isLoading: areApprovalsLoading } = useCollection<PendingApproval>(pendingApprovalsQuery);

  useEffect(() => {
    if (userProfile) {
      console.log('Dashboard Debug:', {
        role: userProfile.role,
        uid: userProfile.uid,
        walletAddress: userProfile.walletAddress,
        shipmentsCount: shipments?.length,
        shipmentsQuery: shipmentsQuery ? 'Active' : 'Null'
      });
      if (shipments) {
        console.log('Fetched Shipments:', shipments);
      }
    }
  }, [userProfile, shipments, shipmentsQuery]);
  
  const isPageLoading = areShipmentsLoading || areApprovalsLoading;

  if (!userProfile || userProfile.role === 'Oracle' || isPageLoading) {
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
