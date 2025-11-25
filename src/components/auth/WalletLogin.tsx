'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet, AlertCircle } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { toast } from 'react-hot-toast';
import { readContract } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { RegistrationABI } from '@/contracts/Registration';
import { OracleManagerABI } from '@/contracts/OracleManager';
import { getContractAddress } from '@/contracts/addresses';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function WalletLogin() {
  const router = useRouter();
  const firestore = useFirestore();
  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle wallet connection
  const handleWalletConnect = async () => {
    setError(null);
    setLoading(true);
    const toastId = toast.loading('Connecting wallet...');

    try {
      const injectedConnector = connectors.find(c => c.id === 'injected');
      if (!injectedConnector) {
        throw new Error('MetaMask or other wallet not detected. Please install a wallet extension.');
      }

      await connectAsync({ connector: injectedConnector });
      toast.success('Wallet connected!', { id: toastId });
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to connect wallet';
      setError(errorMessage);
      toast.error(errorMessage, { id: toastId });
      setLoading(false);
    }
  };

  // Handle wallet login after connection
  useEffect(() => {
    if (isConnected && connectedAddress) {
      performWalletLogin(connectedAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, connectedAddress]);

  const performWalletLogin = async (walletAddress: string) => {
    const toastId = toast.loading('Verifying wallet ownership...');

    try {
      // 1. Find user by wallet address directly (uid = wallet address after fix)
      const normalizedAddress = walletAddress.toLowerCase();
      const usersRef = collection(firestore, 'users');
      
      // Direct lookup: users are now stored with uid = walletAddress
      const userDocRef = doc(usersRef, normalizedAddress);
      const userDocSnapshot = await getDoc(userDocRef);

      if (!userDocSnapshot.exists()) {
        // Fallback: try querying by walletAddress field for users created before the fix
        const q = query(usersRef, where('walletAddress', '==', normalizedAddress));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('No account found for this wallet address. Please register first.');
          toast.error('Wallet not registered. Please register first.', { id: toastId });
          disconnect();
          setLoading(false);
          return;
        }

        // Use the first matching document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Proceed with verification
        performVerification(userData, userId, normalizedAddress, toastId);
      } else {
        // Direct lookup found the user
        const userData = userDocSnapshot.data();
        const userId = userDocSnapshot.id;

        // Proceed with verification
        performVerification(userData, userId, normalizedAddress, toastId);
      }
    } catch (error: any) {
      console.error('Wallet Login Error:', error);
      const errorMessage = error?.cause?.shortMessage || error.message || 'An error occurred during login';
      setError(errorMessage);
      toast.error(`Login Failed: ${errorMessage}`, { id: toastId });
      disconnect();
      setLoading(false);
    }
  };

  const performVerification = async (userData: any, userId: string, walletAddress: string, toastId: string) => {
    try {
      toast.loading('Verifying on-chain status...', { id: toastId });

      // 2. Verify user is registered on-chain
      const registrationContractAddress = getContractAddress('Registration');
      if (!registrationContractAddress) {
        throw new Error('Registration contract not found for this network.');
      }

      const participantData = await readContract(config, {
        abi: RegistrationABI,
        address: registrationContractAddress,
        functionName: 'getParticipant',
        args: [walletAddress as `0x${string}`],
        chainId: chainId,
      });

      const [, , , , active] = participantData as [bigint, bigint, bigint, bigint, boolean];

      // If registration says not active, allow OracleManager fallback for Oracle role
      if (!active) {
        // If this wallet belongs to an Oracle in our Firestore, check OracleManager contract
        if (userData?.role === 'Oracle') {
          const oracleManagerAddress = getContractAddress('OracleManager');
          if (oracleManagerAddress) {
            try {
              const isOracleOnOracleManager = await readContract(config, {
                abi: OracleManagerABI,
                address: oracleManagerAddress,
                functionName: 'isOracle',
                args: [walletAddress as `0x${string}`],
                chainId: chainId,
              });

              if (isOracleOnOracleManager) {
                // allow login despite Registration showing inactive
              } else {
                setError('Your wallet is not active on-chain. Please contact support.');
                toast.error('Wallet inactive on-chain.', { id: toastId });
                disconnect();
                setLoading(false);
                return;
              }
            } catch (oracleErr) {
              console.warn('OracleManager check failed:', oracleErr);
              setError('Your wallet is not active on-chain. Please contact support.');
              toast.error('Wallet inactive on-chain.', { id: toastId });
              disconnect();
              setLoading(false);
              return;
            }
          } else {
            setError('Registration contract not found for this network.');
            toast.error('On-chain contracts missing.', { id: toastId });
            disconnect();
            setLoading(false);
            return;
          }
        } else {
          setError('Your wallet is not active on-chain. Please contact support.');
          toast.error('Wallet inactive on-chain.', { id: toastId });
          disconnect();
          setLoading(false);
          return;
        }
      }

      // 3. KYC check removed - users can login even with pending KYC
      // KYC status is informational only, doesn't block wallet login

      toast.success(`Welcome back, ${userData.name}!`, { id: toastId });

      // 4. Store wallet user session in localStorage (so Firebase provider recognizes them)
      const walletUserSession = {
        uid: userId,
        role: userData.role,
        name: userData.name,
        email: userData.email,
        walletAddress: walletAddress,
        kycVerified: userData.kycVerified,
      };
      localStorage.setItem('user', JSON.stringify(walletUserSession));

      // 5. Update Firestore to mark wallet login (optional, for tracking)
      try {
        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, {
          lastWalletLogin: new Date(),
          isWalletLoggedIn: true,
        });
      } catch (updateErr) {
        console.warn('Could not update last wallet login timestamp:', updateErr);
        // Continue anyway, not critical
      }

      // 6. Redirect based on role
      const dashboardRoute = getDashboardRoute(userData.role);
      router.push(dashboardRoute);
    } catch (error: any) {
      console.error('Verification Error:', error);
      const errorMessage = error?.cause?.shortMessage || error.message || 'An error occurred during verification';
      setError(errorMessage);
      toast.error(`Login Failed: ${errorMessage}`, { id: toastId });
      disconnect();
      setLoading(false);
    }
  };

  const getDashboardRoute = (role: string) => {
    // Resilient mapping: normalize role value (case-insensitive, trimmed)
    const normalized = (role || '').toString().trim().toLowerCase();
    const map: { [key: string]: string } = {
      // Use generic dashboard for Farmer/Transporter/Industry
      farmer: '/dashboard',
      transporter: '/dashboard',
      industry: '/dashboard',
      // Government should land on oversight
      government: '/dashboard/oversight',
      oracle: '/dashboard/oracle',
      admin: '/admin',
    };
    return map[normalized] || '/dashboard';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Login</CardTitle>
        <CardDescription>
          Connect your wallet to login if you already have a registered account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected && connectedAddress ? (
          <div className="space-y-4">
            <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
              <Label className="text-sm text-muted-foreground">Connected Wallet</Label>
              <p className="font-mono text-sm font-semibold mt-2 break-all">{connectedAddress}</p>
            </div>

            <Button
              onClick={() => {
                disconnect();
                setError(null);
              }}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Disconnect Wallet
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Verifying your account details...
            </p>
          </div>
        ) : (
          <Button
            onClick={handleWalletConnect}
            className="w-full"
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            )}
          </Button>
        )}

        <div className="space-y-2 text-xs text-muted-foreground">
          <p>• Make sure you have MetaMask or another web3 wallet installed</p>
          <p>• Your wallet address must be registered in the system</p>
          <p>• Your account must have completed KYC verification</p>
        </div>
      </CardContent>
    </Card>
  );
}
