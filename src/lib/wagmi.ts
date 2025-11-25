import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';

// Custom Anvil chain configuration for local development
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
