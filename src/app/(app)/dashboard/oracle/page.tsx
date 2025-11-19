'use client';

import { useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { OracleDashboard } from '@/components/oracle/OracleDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Shipment } from '@/lib/types';

// This is the page component that fetches data and passes it to the display component.
function OraclePage() {
  const firestore = useFirestore();

  // Fetch all the collections required by the OracleDashboard component.
  const { data: shipments, isLoading: areShipmentsLoading } = useCollection<Shipment>(query(collection(firestore, 'shipments')));
  const isLoading = areShipmentsLoading;

  if (isLoading) {
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
      {/* Skeleton for In-Transit Shipments card */}
            <div>
                <Skeleton className="h-8 w-1/3 mb-4" />
                <Skeleton className="h-4 w-2/3 mb-6" />
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
    );
  }

  // Render the fully-functional, existing dashboard component with the fetched data.
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <OracleDashboard 
        shipments={shipments || []} 
      />
    </div>
  );
}

export default OraclePage;
