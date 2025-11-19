'use client';

import { useTokenBalance } from '@/hooks/useTokenBalance';
import { Coins, Loader2 } from 'lucide-react';

export function TokenBalanceDisplay() {
  const { balance, isLoading, isConnected } = useTokenBalance();

  if (!isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-sm font-medium">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Coins className="h-4 w-4 text-amber-500" />
      )}
      <span className="whitespace-nowrap">
        {isLoading ? 'Loading...' : `${parseFloat(balance).toFixed(2)} AGT`}
      </span>
    </div>
  );
}
