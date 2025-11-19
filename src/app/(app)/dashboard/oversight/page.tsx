'use client';

import { useMemo } from 'react';
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from '@/components/common/PageHeader';
import { OversightClient } from '@/components/oversight/OversightClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Shipment } from '@/lib/types';

export default function GovernmentOversightPage() {
  const firestore = useFirestore();

  // **THE FIX**
  // The `firestore` object from `useFirestore()` is not a stable dependency.
  // Including it in the `useMemo` dependency array was causing the query to be
  // recreated on every render, triggering an infinite loop in `useCollection`.
  // By removing it, we ensure the query is created only once.
  const shipmentsQuery = useMemo(() => {
    const shipmentsRef = collection(firestore, 'shipments');
    return query(shipmentsRef);
  }, []); // <-- Dependency array is now empty and stable

  const { data: shipments, isLoading } = useCollection<Shipment>(shipmentsQuery);

   if (isLoading) {
     return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-8 space-y-8">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader>
        <PageHeaderHeading>Government Oversight</PageHeaderHeading>
        <PageHeaderDescription>
          A global view of all supply chain shipments with AI-powered anomaly detection.
        </PageHeaderDescription>
      </PageHeader>
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <OversightClient shipments={shipments || []} />
      </div>
    </div>
  );
}
