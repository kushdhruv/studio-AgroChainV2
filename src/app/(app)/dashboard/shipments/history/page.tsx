
'use client';

import { PageHeader, PageHeaderDescription, PageHeaderHeading } from '@/components/common/PageHeader';
import { MarketplaceClient } from '@/components/marketplace/MarketplaceClient';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, and, doc } from 'firebase/firestore';
import type { Shipment, User as AppUser } from '@/lib/types';

export default function ShipmentHistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);

  const historyShipmentsQuery = useMemoFirebase(() => {
    if (!user || !userProfile) return null;

    const shipmentsRef = collection(firestore, 'shipments');
    // History includes Claimed (Completed) and Cancelled shipments
    const historyStatuses = ['Claimed', 'Cancelled'];
    
    const baseQuery = where('status', 'in', historyStatuses);

    // Create a role-specific query
    switch (userProfile.role) {
      case 'Farmer':
        return query(shipmentsRef, and(baseQuery, where('farmerId', '==', user.uid)));
      case 'Industry':
        return query(shipmentsRef, and(baseQuery, where('industryId', '==', user.uid)));
      case 'Transporter':
        if (!userProfile.walletAddress) return null; 
        return query(shipmentsRef, and(baseQuery, where('transporterId', '==', userProfile.walletAddress)));
      default:
        return null;
    }
  }, [firestore, user, userProfile]);

  const { data: shipments, isLoading: areShipmentsLoading } = useCollection<Shipment>(historyShipmentsQuery);

  const isLoading = isUserLoading || isProfileLoading || areShipmentsLoading;
  
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader>
        <PageHeaderHeading>Shipment History</PageHeaderHeading>
        <PageHeaderDescription>
          View your past completed and cancelled shipments.
        </PageHeaderDescription>
      </PageHeader>
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        {shipments && shipments.length > 0 ? (
            <MarketplaceClient shipments={shipments} />
        ) : (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No history found.</p>
            </div>
        )}
      </div>
    </div>
  );
}
