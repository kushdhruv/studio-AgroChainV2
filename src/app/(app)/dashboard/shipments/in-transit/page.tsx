'use client';

import React from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shipment } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/components/dashboard/shipment-columns';

// This is the dedicated page for In-Transit Shipments, as requested.

const InTransitShipmentsPage = () => {
  const firestore = useFirestore();
  const shipmentsRef = collection(firestore, 'shipments');
  const shipmentsQuery = query(shipmentsRef, where('status', '==', 'In-Transit'));

  const { data: shipments, isLoading, error } = useCollection<Shipment>(shipmentsQuery);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading shipments: {error.message}</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-6">In-Transit Shipments</h1>
      <Card>
        <CardHeader>
          <CardTitle>All In-Transit Shipments</CardTitle>
        </CardHeader>
        <CardContent>
            <DataTable columns={columns} data={shipments || []} />
        </CardContent>
      </Card>
    </div>
  );
};

export default InTransitShipmentsPage;
