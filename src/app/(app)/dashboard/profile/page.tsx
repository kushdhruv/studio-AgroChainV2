
'use client';

import { ProfileClient } from '@/components/profile/ProfileClient';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/common/PageHeader';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading || !userProfile) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-8">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }
  
  const description = userProfile.kycVerified 
    ? "View and manage your account details."
    : "Please complete your profile to get verified and access all platform features.";

  return (
    <div>
      <PageHeader>
        <PageHeaderHeading>Your Profile</PageHeaderHeading>
        <PageHeaderDescription>{description}</PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
            <ProfileClient user={userProfile} />
        </div>
      </div>
    </div>
  );
}
