'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { anvil } from 'viem/chains'; // or define your own chain manually

// Custom Anvil chain if you want explicit definition
const localAnvil = {
  id: 31337,
  name: 'Anvil Local',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  testnet: true,
};

export const config = createConfig({
  chains: [localAnvil],
  connectors: [injected()],
  transports: {
    [localAnvil.id]: http('http://127.0.0.1:8545'),
  },
});

const queryClient = new QueryClient();

export function WagmiWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
