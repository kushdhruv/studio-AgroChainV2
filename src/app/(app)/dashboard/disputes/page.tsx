'use client';

import { PageHeader, PageHeaderDescription, PageHeaderHeading } from '@/components/common/PageHeader';
import { DisputesClient } from '@/components/disputes/DisputesClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Dispute } from '@/lib/types';
import type { User as AppUser } from '@/lib/types';

export default function DisputesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Ensure the hook user is typed as your AppUser
  const appUser = user as unknown as AppUser | null;

  const disputesQuery = useMemoFirebase(() => {
    if (!appUser) return null;

    const disputesRef = collection(firestore, 'disputes');

    // ✅ Admins and Government users can view all disputes
    if (appUser.role === 'Admin' || appUser.role === 'Government') {
      return query(disputesRef);
    }

    // ✅ Others can only see disputes they raised
    return query(
      disputesRef,
      where('raiserId', '==', appUser.uid)
    );
  }, [firestore, appUser]);

  const { data: disputes, isLoading: areDisputesLoading } = useCollection<Dispute>(disputesQuery);

  const isLoading = isUserLoading || areDisputesLoading;

  // ✅ Loading UI
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-8">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // ✅ Final UI
  return (
    <div className="flex flex-col h-full">
      <PageHeader>
        <PageHeaderHeading>Dispute Management</PageHeaderHeading>
        <PageHeaderDescription>
          Review and manage disputes raised on the platform.
        </PageHeaderDescription>
      </PageHeader>

      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <DisputesClient disputes={disputes || []} />
      </div>
    </div>
  );
}
