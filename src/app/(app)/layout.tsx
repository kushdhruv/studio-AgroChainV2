'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/dashboard/AppHeader';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { useContractEvents } from '@/hooks/use-contract-events';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  useContractEvents();

  console.log("🟡 [LAYOUT] Render start — user:", user);

  const userProfileRef = useMemoFirebase(() => {
    if (user && user.email?.includes('@')) {
      console.log("🟢 [LAYOUT] Using Firestore doc for email user:", user.uid);
      return doc(firestore, 'users', user.uid);
    }
    console.log("🟠 [LAYOUT] Skipping Firestore fetch — wallet-based user");
    return null;
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);

  console.log("🟣 [LAYOUT] userProfile:", userProfile);
  console.log("🟣 [LAYOUT] isProfileLoading:", isProfileLoading);

  useEffect(() => {
    console.log("🔵 [LAYOUT useEffect] Checking login state...");
    if (!isUserLoading && !user) {
      console.log("🔴 [LAYOUT] No user found, redirecting to /login");
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const finalUser: AppUser | null = user?.email?.includes('@')
    ? (userProfile as AppUser | null)
    : (user as unknown as AppUser | null);

  console.log("🟠 [LAYOUT] finalUser:", finalUser);

  const isLoading = isUserLoading || (user?.email?.includes('@') && isProfileLoading);
  console.log("🟣 [LAYOUT] isLoading:", isLoading);

  if (isLoading || !finalUser) {
    console.log("🟤 [LAYOUT] Still loading... showing skeleton");
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  console.log("✅ [LAYOUT] Rendering Dashboard Layout for user:", finalUser?.role);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <DashboardSidebar user={finalUser} />
        <SidebarInset className="flex-1 flex flex-col">
          <AppHeader user={finalUser} />
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
