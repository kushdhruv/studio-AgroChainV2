
'use client';

import { PageHeader, PageHeaderDescription, PageHeaderHeading } from '@/components/common/PageHeader';
import { TransportersClient } from '@/components/transporters/TransportersClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { User } from '@/lib/types';

export default function TransportersPage() {
  const firestore = useFirestore();

  const transportersQuery = useMemoFirebase(() => {
    const usersRef = collection(firestore, 'users');
    return query(
        usersRef,
        where('role', '==', 'Transporter'),
        where('kycVerified', '==', true)
    );
  }, [firestore]);

  const { data: transporters, isLoading } = useCollection<User>(transportersQuery);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-8">
            <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader>
        <PageHeaderHeading>Verified Transporters</PageHeaderHeading>
        <PageHeaderDescription>
          A list of all KYC-verified transporters available on the platform.
        </PageHeaderDescription>
      </PageHeader>
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <TransportersClient transporters={transporters || []} />
      </div>
    </div>
  );
}
