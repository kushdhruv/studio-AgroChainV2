'use client';

import { Button } from '@/components/ui/button';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { AppLogo } from '@/components/common/AppLogo';
import { Skeleton } from '@/components/ui/skeleton';
import type { User as AppUser } from '@/lib/types';
import Link from 'next/link';
import { UserNav } from '@/components/dashboard/UserNav';
import { Home, ShieldCheck } from 'lucide-react';
import { doc, setDoc } from "firebase/firestore";


function AdminHeader({ user }: { user: AppUser }) {
    return (
        <header className="flex h-16 items-center justify-between border-b px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="flex items-center gap-2" aria-label="AgriChain Admin Home">
                    <AppLogo className="h-7 w-7" />
                    <span className="font-headline text-xl font-bold text-gray-800">AgriChain Admin</span>
                </Link>
            </div>
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-sm flex items-center gap-2 hover:text-accent">
                    <Home className="h-4 w-4"/>
                    <span>Main Dashboard</span>
                </Link>
                <UserNav user={user} />
            </div>
        </header>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

const userProfileRef = useMemoFirebase(() => {
  if (user && user.uid) {
    return doc(firestore, 'users', user.uid);
  }
  return null;
}, [firestore, user]);


  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);
    useEffect(() => {
  if (user && !isProfileLoading && !userProfile) {
    const defaultProfile = {
      uid: user.uid,
      role: 'Admin',
      walletAddress: user.uid,
      name: 'Admin',
      email: '',
      createdAt: new Date().toISOString(),
    };
    setDoc(doc(firestore, 'users', user.uid), defaultProfile);
  }
}, [user, userProfile, isProfileLoading, firestore]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userProfile && userProfile.role !== 'Admin') {
        // If the user is logged in but not an admin, kick them out.
        router.replace('/dashboard');
    }
  }, [userProfile, router]);

  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading || !userProfile) {
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

  // Final check to ensure we don't render for non-admins
  if (userProfile.role !== 'Admin') {
      return (
         <div className="flex h-screen w-full items-center justify-center bg-background text-center">
            <div>
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        </div>
      );
  }

const safeUserProfile = userProfile ? JSON.parse(JSON.stringify(userProfile)) : null;
  return (
    <div className="flex min-h-screen flex-col">
        <AdminHeader user={safeUserProfile} />
        <main className="flex-1 bg-muted/20">
            {children}
        </main>
    </div>
  );
}
