'use client';

import { useMemo } from 'react'; // <-- 1. Import useMemo
import { MarketplaceClient } from '@/components/marketplace/MarketplaceClient';
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from '@/components/common/PageHeader';
import { useCollection, useFirestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where } from 'firebase/firestore';
import type { Shipment } from '@/lib/types';

export default function MarketplacePage() {
  const firestore = useFirestore();

  // 2. Wrap the query creation in useMemo
  const shipmentsQuery = useMemo(() => {
    const shipmentsRef = collection(firestore, 'shipments');
    return query(shipmentsRef, where('status', '==', 'Pending'));
  }, [firestore]); // 3. Add 'firestore' as a dependency

  const { data: openShipments, isLoading } = useCollection<Shipment>(shipmentsQuery);

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
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader>
        <PageHeaderHeading>Marketplace</PageHeaderHeading>
        <PageHeaderDescription>
          Browse and accept new shipments of agricultural produce and waste.
        </PageHeaderDescription>
      </PageHeader>
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <MarketplaceClient shipments={openShipments || []} />
      </div>
    </div>
  );
}