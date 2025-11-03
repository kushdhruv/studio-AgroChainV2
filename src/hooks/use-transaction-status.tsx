/**
 * Custom hook for enhanced transaction status tracking
 * Provides loading states, pending status, success/failure toasts, and retry logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useToast } from '@/hooks/use-toast';

interface UseTransactionStatusOptions {
  contractName?: string;
  functionName?: string;
  contractAddress?: `0x${string}`;
  onSuccess?: (receipt: any) => void | Promise<void>;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useTransactionStatus(options: UseTransactionStatusOptions = {}) {
  const { toast } = useToast();
  const {
    writeContractAsync,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [retryCount, setRetryCount] = useState(0);

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isFailed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash,
    },
  });

  // Show pending toast when transaction is submitted
  useEffect(() => {
    if (txHash && isConfirming) {
      toast({
        title: 'Transaction Pending',
        description: `Transaction submitted. Hash: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
      });
    }
  }, [txHash, isConfirming, toast]);

  // Reset transaction hash when write completes
  useEffect(() => {
    if (!isWriting && txHash) {
      // Hash is set, transaction submitted
    }
  }, [isWriting, txHash]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && receipt && txHash) {
      const contractFunc = options.functionName 
        ? `${options.contractName || 'Contract'}.${options.functionName}`
        : options.contractName || 'Transaction';

      toast({
        title: 'Transaction Confirmed',
        description: options.successMessage || `${contractFunc} completed successfully.\nTx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
      });

      // Call stored callbacks or options callbacks
      const callbacks = (window as any).__txCallbacks;
      if (callbacks?.onSuccess) {
        callbacks.onSuccess(receipt);
        delete (window as any).__txCallbacks;
      } else if (options.onSuccess) {
        options.onSuccess(receipt);
      }

      // Reset state
      setTxHash(undefined);
      setRetryCount(0);
    }
  }, [isConfirmed, receipt, txHash, options, toast]);

  // Handle transaction failure
  useEffect(() => {
    if (isFailed && (confirmError || writeError)) {
      const error = confirmError || writeError;
      const contractFunc = options.functionName
        ? `${options.contractName || 'Contract'}.${options.functionName}`
        : options.contractName || 'Transaction';

      const errorMsg = error?.message || 'Unknown error';
      const errorCode = error?.name || 'N/A';
      const txHashStr = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : 'N/A';
      const contractAddr = options.contractAddress ? `${options.contractAddress.slice(0, 10)}...` : 'N/A';

      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: options.errorMessage || 
          `${contractFunc} failed on contract ${contractAddr}\nError: ${errorMsg}\nCode: ${errorCode}\nTx: ${txHashStr}`,
      });

      // Call stored callbacks or options callbacks
      const callbacks = (window as any).__txCallbacks;
      if (callbacks?.onError && error) {
        callbacks.onError(error as Error);
        delete (window as any).__txCallbacks;
      } else if (options.onError && error) {
        options.onError(error as Error);
      }
    }
  }, [isFailed, confirmError, writeError, txHash, options, toast]);

  // Enhanced write contract function with automatic hash tracking
  const writeContract = useCallback(async (config: any, callbacks?: { onSuccess?: (receipt: any) => void | Promise<void>; onError?: (error: Error) => void }) => {
    try {
      // Validate contract address
      if (config.address && !config.address.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error(`Invalid contract address: ${config.address}`);
      }

      resetWrite(); // Reset any previous errors
      
      // Show submission toast
      const contractFunc = config.functionName
        ? `${options.contractName || 'Contract'}.${config.functionName}`
        : options.contractName || 'Transaction';
      
      toast({
        title: 'Submitting Transaction',
        description: `Submitting ${contractFunc} to blockchain...`,
      });

      const hash = await writeContractAsync(config);
      setTxHash(hash);
      
      // Store callbacks for later use
      if (callbacks) {
        // Store in a ref or state to use when transaction confirms
        // For now, we'll handle this in the success/error effects
        (window as any).__txCallbacks = callbacks;
      }
      
      return hash;
    } catch (error: any) {
      const contractFunc = config.functionName
        ? `${options.contractName || 'Contract'}.${config.functionName}`
        : options.contractName || 'Transaction';
      
      const contractAddr = config.address || options.contractAddress || 'N/A';
      const errorDetails = error?.message || 'Unknown error';
      const errorCode = error?.code || 'N/A';

      toast({
        variant: 'destructive',
        title: 'Transaction Submission Failed',
        description: `${contractFunc} failed on contract ${contractAddr.slice(0, 10)}...\nError: ${errorDetails}\nCode: ${errorCode}`,
      });

      if (callbacks?.onError && error) {
        callbacks.onError(error as Error);
      } else if (options.onError && error) {
        options.onError(error as Error);
      }
      throw error;
    }
  }, [writeContractAsync, resetWrite, options, toast]);

  // Retry function
  const retry = useCallback(async (config: any) => {
    setRetryCount((prev) => prev + 1);
    return writeContract(config);
  }, [writeContract]);

  const isLoading = isWriting || isConfirming;
  const isPending = isWriting;
  const isSuccess = isConfirmed;
  const isError = isFailed;

  return {
    writeContract,
    retry,
    txHash,
    receipt,
    isLoading,
    isPending,
    isWriting,
    isConfirming,
    isSuccess,
    isConfirmed,
    isError,
    isFailed,
    error: confirmError || writeError,
    retryCount,
    reset: () => {
      resetWrite();
      setTxHash(undefined);
      setRetryCount(0);
    },
  };
}

