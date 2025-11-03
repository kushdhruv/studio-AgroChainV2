import { useEffect } from 'react';
import { useAuthState } from '@/lib/auth-state';
import { useToast } from './use-toast';
import type { Hash } from 'viem';

/**
 * Custom hook to handle auth form state and transitions
 */
export function useAuthForm() {
  const { toast } = useToast();
  const authState = useAuthState();

  useEffect(() => {
    // Watch for registration step changes
    switch (authState.registrationStep) {
      case 'wallet-connecting':
        toast({
          title: "Connecting Wallet",
          description: "Please approve the wallet connection.",
        });
        break;
      case 'blockchain-pending':
        toast({
          title: "Blockchain Transaction",
          description: "Please confirm the transaction in your wallet.",
        });
        break;
      case 'firebase-pending':
        toast({
          title: "Creating Profile",
          description: "Setting up your account details...",
        });
        break;
      case 'completed':
        toast({
          title: "Registration Complete",
          description: "Your account has been created successfully!",
        });
        break;
    }
  }, [authState.registrationStep, toast]);

  const handleTransactionError = (error: Error, hash?: Hash) => {
    authState.setRegistrationStep('idle');
    authState.setPendingTransaction(null);

    if ('code' in error && (error as any).code === 'ACTION_REJECTED') {
      toast({
        variant: "destructive",
        title: "Transaction Rejected",
        description: "You rejected the transaction. Please try again when ready.",
      });
    } else if (error.message?.toLowerCase().includes('insufficient funds')) {
      toast({
        variant: "destructive",
        title: "Insufficient Funds",
        description: "Your wallet doesn't have enough funds for the transaction. Please add funds and try again.",
      });
    } else {
      console.error('Transaction error:', error, hash);
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: error.message || "An unexpected error occurred during the transaction.",
      });
    }
  };

  const handleFirebaseError = (error: any) => {
  authState.setRegistrationStep('idle');

  // 🔍 Log full Firebase error details
  console.group("🔥 Firebase Registration Error");
  console.error("Code:", error.code);
  console.error("Message:", error.message);
  console.error("Stack:", error.stack);
  console.groupEnd();

  if (error.code === 'auth/email-already-in-use') {
    toast({
      variant: "destructive",
      title: "Email Already Registered",
      description: "This email is already in use. Please log in or use a different email address.",
    });
  } else {
    toast({
      variant: "destructive",
      title: "Account Creation Failed",
      description: "Failed to create your account. Please try again or contact support.",
    });
  }
};


  return {
    handleTransactionError,
    handleFirebaseError,
    registrationStep: authState.registrationStep,
    setRegistrationStep: authState.setRegistrationStep,
    setPendingTransaction: authState.setPendingTransaction
  };
}