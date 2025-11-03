'use client';

import { Button } from '@/components/ui/button-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import type { User as AppUser } from '@/lib/types';

export function ConnectWallet({ user: userProfile }: { user: AppUser | null }) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    const syncWalletAddress = async () => {
      if (isConnected && address && user && userProfile && userProfile.walletAddress !== address) {
        try {
          const userRef = doc(firestore, 'users', user.uid);

          // ✅ Use setDoc with merge instead of updateDocumentNonBlocking
          await setDoc(
            userRef,
            { walletAddress: address },
            { merge: true } // merges if the doc already exists
          );
        } catch (err) {
          console.error('Failed to sync wallet address with Firestore:', err);
        }
      }
    };

    syncWalletAddress();
  }, [isConnected, address, user, userProfile, firestore]);

  const handleConnect = async () => {
    const injectedConnector = connectors.find(c => c.id === 'injected');
    if (injectedConnector) {
      try {
        await connectAsync({ connector: injectedConnector });
      } catch (err) {
        console.error('Failed to connect wallet:', err);
      }
    }
  };

  if (isConnected && address) {
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Wallet className="mr-2 h-4 w-4" />
            {shortAddress}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Connected Wallet</p>
              <p className="text-xs leading-none text-muted-foreground break-all">
                {address}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={handleConnect}>
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
