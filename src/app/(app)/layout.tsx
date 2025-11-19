'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/dashboard/AppHeader';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { useContractEvents } from '@/hooks/use-contract-events';
import { useAuthState } from '@/lib/auth-state';
import { signOut } from 'firebase/auth';

const createSerializableUser = (user: any) => {
  if (!user) return null;
  // Support both Firebase Auth users and wallet users (Oracle/Admin)
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.name || user.email,
    avatarUrl: user.photoURL || user.avatarUrl || null,
    role: user.role, // Include role for wallet users
    walletAddress: user.walletAddress, // Include wallet address for wallet users
    kycVerified: user.kycVerified, // Include KYC status
  };
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const authUser = useMemo(() => createSerializableUser(user), [user]);

  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { user: profile, setUser: setProfile } = useAuthState();

  const fetchAndSetProfile = useCallback(async (user: any) => {
    if (!firestore) return;
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const plainUserObject = JSON.parse(JSON.stringify(docSnap.data()));
        setProfile(plainUserObject as AppUser);
      } else {
        console.warn(`[LAYOUT] No profile found for UID: ${user.uid}. Creating a default profile.`);
        const defaultProfile: AppUser = {
          uid: user.uid,
          email: user.email!,
          name: user.name!,
          role: user.role || 'Farmer', // Use role from authUser, fallback to 'Farmer'
          kycVerified: user.kycVerified || false,
          details: user.details || {},
        };
        await setDoc(userDocRef, defaultProfile);
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error("🔴 [LAYOUT] Critical error fetching or creating user profile:", error);
      await signOut(auth);
      setProfile(null);
    }
  }, [firestore, auth, setProfile]);

  useEffect(() => {
    if (isAuthLoading || !firestore) return;

    if (!authUser) {
      setProfile(null);
      router.replace('/login');
      return;
    }

    // Check if authUser is a localStorage user (any user type: Oracle, Admin, Farmer, Transporter, Industry, Government)
    // localStorage users have role and uid properties set by login handlers
    const isLocalStorageUser = authUser.role && authUser.uid && (authUser as any).walletAddress !== undefined;

    if (isLocalStorageUser || authUser.role === 'Oracle' || authUser.role === 'Admin') {
      // For localStorage users (wallet-based or email/password stored to localStorage), 
      // the authUser IS the profile (from localStorage/provider)
      // Just set it directly without fetching from Firestore
      const plainUserObject = JSON.parse(JSON.stringify(authUser));
        // Only update the profile store if it's missing or belongs to a different UID
        if (!profile || profile.uid !== plainUserObject.uid) {
          setProfile(plainUserObject as AppUser);
        }
    } else if (!profile || profile.uid !== authUser.uid) {
      // For Firebase Auth users not in localStorage, fetch from Firestore
      fetchAndSetProfile(authUser);
    }

  }, [authUser, isAuthLoading, firestore, router, profile, fetchAndSetProfile, setProfile]);

  // THE DEFINITIVE FIX: The loading state must wait for auth, firestore, AND the user's profile to be ready.
  // This prevents child components from rendering before the firestore instance is available.
  const isLoading = isAuthLoading || !firestore || !profile;

  if (isLoading) {
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
  
  // This component will only render when the profile is guaranteed to be loaded and not null.
  const serializableProfile = JSON.parse(JSON.stringify(profile));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <DashboardSidebar user={serializableProfile} />
        <SidebarInset className="flex-1 flex flex-col">
          <AppHeader user={serializableProfile} />
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
