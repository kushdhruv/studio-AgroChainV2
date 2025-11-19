'use client';

import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import type { User as AppUser} from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useDisconnect } from 'wagmi';
import { toast } from 'react-hot-toast';

export function UserNav({ user }: { user: AppUser }) {
  const auth = useAuth();
  const router = useRouter();
  const { disconnect } = useDisconnect();
  
  const handleLogout = async () => {
    // Check if user is logged in via wallet (has walletAddress)
    if (user.walletAddress) {
      // Wallet login - disconnect wallet and redirect
      disconnect();
      toast.success('Logged out successfully');
      router.push('/login');
    } else if (user.email.includes('@')) {
      // Firebase email login
      await signOut(auth);
      router.push('/login');
    } else {
      // Oracle login via localStorage
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const fallback = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {user.walletAddress && (
              <p className="text-xs leading-none text-muted-foreground font-mono">
                {user.walletAddress.substring(0, 10)}...{user.walletAddress.substring(user.walletAddress.length - 8)}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/profile" passHref>
             <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
