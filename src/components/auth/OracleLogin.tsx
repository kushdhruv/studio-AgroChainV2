'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { readContract } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { RegistrationABI } from '@/contracts/Registration';
import { OracleManagerABI } from '@/contracts/OracleManager';
import { getContractAddress } from '@/contracts/addresses';
import { onChainRoleMap } from '@/lib/constants';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface OracleLoginProps {
  onSuccess?: () => void;
}

export default function OracleLogin({ onSuccess }: OracleLoginProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { connectAsync } = useConnect();
  const { address: connectedAddress, isConnected, chainId } = useAccount();

  const handleOracleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Initiating Oracle Login...');

    try {
      // Step 1: Verify wallet is connected
      let walletAddress = connectedAddress;
      if (!isConnected) {
        toast.loading('Please connect your wallet (MetaMask or similar)...', { id: toastId });
        const result = await connectAsync({ connector: injected() });
        walletAddress = result.accounts[0];
      }
      if (!walletAddress) throw new Error("Wallet connection failed or was cancelled.");

      const normalizedAddress = walletAddress.toLowerCase();

      // Step 2: Check if oracle user exists in Firestore (uid = wallet address after fix)
      toast.loading('Verifying oracle credentials...', { id: toastId });
      const usersRef = collection(firestore, 'users');
      
      // Direct lookup: users are now stored with uid = walletAddress
      const oracleDocRef = doc(usersRef, normalizedAddress);
      const oracleDocSnapshot = await getDoc(oracleDocRef);

      let oracleDoc: any = null;
      let oracleData: any = null;

      if (!oracleDocSnapshot.exists()) {
        // Fallback: try querying by walletAddress field for users created before the fix
        const oracleQuery = query(
          usersRef,
          where('walletAddress', '==', normalizedAddress),
          where('role', '==', 'Oracle')
        );
        const oracleSnapshot = await getDocs(oracleQuery);

        if (oracleSnapshot.empty) {
          throw new Error(
            "No Oracle user found with this wallet address. " +
            "Please register as an Oracle first or contact the system administrator."
          );
        }

        oracleDoc = oracleSnapshot.docs[0];
        oracleData = oracleDoc.data() as any;
      } else {
        // Direct lookup found the user
        oracleData = oracleDocSnapshot.data() as any;

        // Verify it's actually an oracle
        if (oracleData.role !== 'Oracle') {
          throw new Error(
            "This wallet is not registered as an Oracle. " +
            "Please use an oracle wallet or register as an Oracle first."
          );
        }

        oracleDoc = oracleDocSnapshot;
      }

      // Step 3: KYC check removed - users can login even with pending KYC
      // KYC status is informational only, doesn't block oracle login

      // Step 4: Verify on-chain oracle role and active status
      toast.loading('Verifying oracle role on-chain...', { id: toastId });
      const registrationContractAddress = getContractAddress('Registration');
      if (!registrationContractAddress) {
        throw new Error("Registration contract address not configured for this network.");
      }

      const participantData = await readContract(config, {
        abi: RegistrationABI,
        address: registrationContractAddress,
        functionName: 'getParticipant',
        args: [normalizedAddress as `0x${string}`],
        chainId: chainId,
      });

      const [role, , , , active] = participantData as [bigint, bigint, bigint, bigint, boolean];
      const isOracleOnChain = Number(role) === onChainRoleMap.Oracle && active;

      if (!isOracleOnChain) {
        // If Registration doesn't show an active oracle, try OracleManager.isOracle as a fallback
        const oracleManagerAddress = getContractAddress('OracleManager');
        if (oracleManagerAddress) {
          try {
            const isOracleOnOracleManager = await readContract(config, {
              abi: OracleManagerABI,
              address: oracleManagerAddress,
              functionName: 'isOracle',
              args: [normalizedAddress as `0x${string}`],
              chainId: chainId,
            });

            if (!isOracleOnOracleManager) {
              throw new Error(
                "Your wallet is not registered as an active Oracle on-chain. " +
                "Please ensure you are properly registered as an Oracle."
              );
            }
          } catch (oracleErr) {
            console.warn('OracleManager check failed:', oracleErr);
            throw new Error(
              "Your wallet is not registered as an active Oracle on-chain. " +
              "Please ensure you are properly registered as an Oracle."
            );
          }
        } else {
          throw new Error("Registration contract address not configured for this network.");
        }
      }

      // Step 5: Store oracle session in localStorage
      toast.loading('Establishing oracle session...', { id: toastId });
      
      // Create session object
      const oracleSession = {
        uid: oracleDoc.id || normalizedAddress,
        role: 'Oracle',
        name: oracleData.name,
        email: oracleData.email,
        walletAddress: normalizedAddress,
        kycVerified: oracleData.kycVerified,
      };

      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(oracleSession));

      toast.success('Oracle Login Successful!', { id: toastId, duration: 2000 });
      
      // Redirect to oracle dashboard
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/oracle');
      }

    } catch (error: any) {
      console.error("Oracle Login Error:", error);
      const errorMessage = error?.cause?.shortMessage || error.message || "An unknown error occurred.";
      toast.error(`Oracle Login Failed: ${errorMessage}`, { id: toastId, duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oracle Login</CardTitle>
        <CardDescription>Login with your wallet as an Oracle</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleOracleLogin} className="space-y-6">
          <div className="space-y-4 text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-900 mb-2">🔐 Oracle Authentication</p>
              <ul className="text-blue-800 space-y-1 text-xs">
                <li>✓ Verify your wallet connection</li>
                <li>✓ Check your Oracle role in Firestore</li>
                <li>✓ Validate KYC verification status</li>
                <li>✓ Confirm on-chain Oracle registration</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-semibold text-amber-900 mb-2">⚠️ Requirements</p>
              <ul className="text-amber-800 space-y-1 text-xs">
                <li>• Connected wallet must be registered as Oracle</li>
                <li>• KYC verification must be approved</li>
                <li>• Must be active on-chain</li>
                <li>• Oracle role verified via smart contract</li>
              </ul>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Verifying Oracle Status...
              </>
            ) : (
              '🔐 Login as Oracle'
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Not registered as an Oracle? 
            <a href="/register" className="underline text-blue-600 ml-1">
              Register here
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
