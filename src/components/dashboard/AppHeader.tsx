'use client';

import { UserNav } from './UserNav';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { User as AppUser} from '@/lib/types';
import { useSidebar } from '@/components/ui/sidebar';
import { ConnectWallet } from '@/components/auth/ConnectWallet';

export function AppHeader({ user }: { user: AppUser }) {
  const { isMobile } = useSidebar();
  
  return (
    <header className="flex h-16 items-center justify-between border-b px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
      </div>
      <div className="flex items-center gap-4">
        <ConnectWallet user={user} />
        <UserNav user={user} />
      </div>
    </header>
  );
}
