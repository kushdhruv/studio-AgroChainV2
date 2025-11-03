'use client';

import { WagmiWrapper } from '@/components/blockchain/WagmiProvider';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiWrapper>
      <FirebaseClientProvider>
        {children}
        <Toaster />
      </FirebaseClientProvider>
    </WagmiWrapper>
  );
}
