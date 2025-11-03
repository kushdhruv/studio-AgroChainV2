
'use client';

import { notFound, useParams } from 'next/navigation';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/common/PageHeader';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';
import type { Dispute, User as AppUser, Shipment } from '@/lib/types';
import { DisputeDetailsClient } from '@/components/disputes/DisputeDetailsClient';


export default function DisputeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const disputeRef = useMemoFirebase(() => doc(firestore, 'disputes', id), [firestore, id]);
  const { data: dispute, isLoading: isDisputeLoading } = useDoc<Dispute>(disputeRef);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);
  
  // Also fetch the related shipment to show its details
  const shipmentRef = useMemoFirebase(() => {
      if(!dispute) return null;
      return doc(firestore, 'shipments', dispute.shipmentId);
  }, [firestore, dispute]);
  const { data: shipment, isLoading: isShipmentLoading } = useDoc<Shipment>(shipmentRef);


  const isLoading = isDisputeLoading || isUserLoading || isProfileLoading || isShipmentLoading;

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

  if (!dispute || !shipment || !userProfile) {
    notFound();
  }

  return (
    <div>
       <PageHeader>
        <PageHeaderHeading>Dispute Details</PageHeaderHeading>
        <PageHeaderDescription>
          Reviewing dispute #{dispute.id.slice(0,8)} for shipment #{shipment.id.slice(0,8)}
        </PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8">
        <DisputeDetailsClient dispute={dispute} shipment={shipment} userProfile={userProfile} />
      </div>
    </div>
  );
}
