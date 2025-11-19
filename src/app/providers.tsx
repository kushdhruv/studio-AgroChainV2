'use client';

import { WagmiWrapper } from '@/components/blockchain/WagmiProvider';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster as ShadToaster } from '@/components/ui/toaster'; // Renamed to avoid conflict
import { Toaster as HotToaster } from 'react-hot-toast'; // The missing Toaster

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <WagmiWrapper>
        {children}
        <ShadToaster />
        <HotToaster />
      </WagmiWrapper>
    </FirebaseClientProvider>
  );
}
