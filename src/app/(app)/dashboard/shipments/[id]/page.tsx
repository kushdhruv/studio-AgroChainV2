'use client';

import { ShipmentDetailsClient } from '@/components/shipments/ShipmentDetailsClient';
import { useParams } from 'next/navigation';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/common/PageHeader';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';
import type { Shipment, User as AppUser } from '@/lib/types';
import dynamic from 'next/dynamic';

const AnomalyDetector = dynamic(() => import('@/components/oversight/AnomalyDetector').then(mod => mod.AnomalyDetector), {
  loading: () => <Skeleton className="h-10 w-32" />,
  ssr: false,
});

export default function ShipmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const shipmentRef = useMemoFirebase(() => doc(firestore, 'shipments', id), [firestore, id]);
  const { data: shipment, isLoading: isShipmentLoading } = useDoc<Shipment>(shipmentRef);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);

  const isLoading = isShipmentLoading || isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-[500px] w-full" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return <p className="p-6 text-red-600">Shipment not found.</p>;
  }

  const safeShipment = JSON.parse(JSON.stringify(shipment));
  const safeUserProfile = userProfile ? JSON.parse(JSON.stringify(userProfile)) : null;

  return (
    <div>
      <PageHeader>
        <PageHeaderHeading>Shipment {safeShipment.id}</PageHeaderHeading>
        <PageHeaderDescription>
          Detailed view of shipment from {safeShipment.origin}
          {safeShipment.destination ? ` to ${safeShipment.destination}` : ''}.
        </PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8">
        {safeUserProfile && safeUserProfile.role === 'Government' && (
          <div className="mb-8">
            <AnomalyDetector shipment={safeShipment} />
          </div>
        )}
        <ShipmentDetailsClient shipment={safeShipment} userProfile={safeUserProfile} />
      </div>
    </div>
  );
}
