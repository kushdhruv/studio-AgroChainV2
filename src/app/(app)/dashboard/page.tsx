
'use client';

import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, and } from 'firebase/firestore';
import type { User as AppUser, Shipment } from '@/lib/types';

interface PendingApproval {
  id: string;
  userId: string;
  name: string;
  role: AppUser['role'];
  date: string;
}

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);

  const shipmentsQuery = useMemoFirebase(() => {
    if (!user || !userProfile) return null;
    
    const shipmentsRef = collection(firestore, 'shipments');

    // Create a query based on the user's role
    switch (userProfile.role) {
      case 'Farmer':
        return query(shipmentsRef, where('farmerId', '==', user.uid));
      case 'Transporter':
                // Transporters are identified by wallet address on shipments
        if (!userProfile.walletAddress) return null;
        return query(
            shipmentsRef, 
            and(
              where('transporterId', '==', userProfile.walletAddress), 
              where('status', 'in', ['ReadyForPickup', 'In-Transit'])
            )
        );
      case 'Industry':
        return query(shipmentsRef, where('industryId', '==', user.uid));
      case 'Admin':
      case 'Government':
        return query(shipmentsRef); // Admins/Gov see all shipments
      case 'Oracle':
      // Oracles need to see in-transit shipments for weighments
      return query(shipmentsRef, where('status', '==', 'In-Transit'))
      default:
        return null;
    }
  }, [firestore, user, userProfile]);

  const { data: shipments, isLoading: areShipmentsLoading } = useCollection<Shipment>(shipmentsQuery);

    // For Oracles, we also need to fetch pending approvals.
  const approvalsQuery = useMemoFirebase(() => {
    if (userProfile?.role !== 'Oracle') return null;
    return query(collection(firestore, 'pendingApprovals'));
  }, [firestore, userProfile]);

  const { data: approvals, isLoading: areApprovalsLoading } = useCollection<PendingApproval>(approvalsQuery);


  const isLoading = isUserLoading || isProfileLoading || areShipmentsLoading || areApprovalsLoading;

  if (isLoading || !userProfile) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return <DashboardPage user={userProfile} shipments={shipments || []} pendingApprovals={approvals || []} />;
}
