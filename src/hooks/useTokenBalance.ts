import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { config } from '@/components/blockchain/WagmiProvider';
import { formatEther } from 'viem';

// Minimal ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export function useTokenBalance(tokenAddress?: `0x${string}` | string) {
  const { address: walletAddress, isConnected } = useAccount();
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to env token address if not provided
  const defaultTokenAddress = (
    process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853'
  ) as `0x${string}`;

  const token = (tokenAddress || defaultTokenAddress) as `0x${string}`;

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      setBalance('0');
      setError(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rawBalance: bigint = await readContract(config, {
          abi: ERC20_ABI,
          address: token,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        }) as bigint;

        // Convert from wei to human-readable format (18 decimals)
        const formattedBalance = formatEther(rawBalance);
        setBalance(formattedBalance);
      } catch (err: any) {
        console.error('Error fetching token balance:', err);
        setError(err.message || 'Failed to fetch balance');
        setBalance('0');
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchBalance();

    // Set up interval to refetch every 10 seconds for real-time updates
    const interval = setInterval(fetchBalance, 10000);

    return () => clearInterval(interval);
  }, [isConnected, walletAddress, token]);

  return {
    balance,
    isLoading,
    error,
    isConnected,
  };
}
