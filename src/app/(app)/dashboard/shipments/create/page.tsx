'use client';

import { PageHeader, PageHeaderDescription, PageHeaderHeading } from '@/components/common/PageHeader';
import { CreateShipmentForm } from '@/components/shipments/CreateShipmentForm';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreateShipmentPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 mt-2" />
        <Skeleton className="h-[500px] w-full mt-8" />
      </div>
    )
  }
  
  return (
    <div>
      <PageHeader>
        <PageHeaderHeading>Create New Shipment</PageHeaderHeading>
        <PageHeaderDescription>
          List your agricultural produce or waste on the marketplace by creating a new shipment.
        </PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8">
        <CreateShipmentForm user={userProfile} />
      </div>
    </div>
  );
}
