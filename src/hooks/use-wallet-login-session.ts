'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { toast } from 'react-hot-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Hook to manage wallet login sessions
 * Wallet login doesn't use localStorage - it relies on the Firestore user profile
 * which is fetched and kept in auth state via the Firebase provider
 */
export function useWalletLoginSession() {
  const router = useRouter();
  const pathname = usePathname();
  const { address: connectedAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user } = useUser();
  const firestore = useFirestore();

  // Check if user is logged in via wallet by checking if they have a walletAddress in Firestore
  const isWalletLoggedIn = useCallback(async (): Promise<boolean> => {
    if (!user || !('uid' in user) || !firestore) return false;
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      return !!(userData?.walletAddress && userData?.kycVerified);
    } catch (err) {
      console.error('Failed to check wallet login status:', err);
      return false;
    }
  }, [user, firestore]);

  // Logout wallet session
  const logoutWalletSession = useCallback(() => {
    disconnect();
    router.push('/login');
    toast.success('Logged out successfully');
  }, [disconnect, router]);

  // Validate wallet connection matches user profile
  useEffect(() => {
    if (!user || !isConnected || !connectedAddress) return;

    // If wallet is connected but user doesn't have a wallet address in profile, disconnect
    if (!('walletAddress' in user) || user.walletAddress !== connectedAddress) {
      console.warn('Connected wallet does not match user profile. Disconnecting.');
      toast.error('Connected wallet does not match your account. Please reconnect.');
      logoutWalletSession();
      return;
    }

    // If on auth pages and wallet is valid, redirect to dashboard
    if (pathname?.includes('(auth)')) {
      const dashboardRoute = getDashboardRoute(('role' in user) ? user.role : 'Farmer');
      router.push(dashboardRoute);
    }
  }, [user, isConnected, connectedAddress, pathname, logoutWalletSession, router]);

  return {
    isWalletLoggedIn: !!user && isConnected && 'walletAddress' in user && (user as any).walletAddress !== undefined,
    logoutWalletSession,
  };
}

/**
 * Determine dashboard route based on user role
 */
function getDashboardRoute(role: string): string {
  const normalized = (role || '').toString().trim().toLowerCase();
  const map: { [key: string]: string } = {
    // Use generic dashboard for Farmer/Transporter/Industry
    farmer: '/dashboard',
    transporter: '/dashboard',
    industry: '/dashboard',
    // Government goes to oversight
    government: '/dashboard/oversight',
    oracle: '/dashboard/oracle',
    admin: '/admin',
  };
  return map[normalized] || '/dashboard';
}

/**
 * Hook to check if user is logged in via wallet
 */
export function useIsWalletLoggedIn(): boolean {
  const { user } = useUser();
  const { isConnected } = useAccount();
  return !!user && isConnected && 'walletAddress' in user && (user as any).walletAddress !== undefined;
}
