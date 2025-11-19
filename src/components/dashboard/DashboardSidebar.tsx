'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User as AppUser, Role } from '@/lib/types';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { AppLogo } from '@/components/common/AppLogo';
import { UserNav } from './UserNav';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wheat,
  Landmark,
  UserCheck,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  DatabaseZap,
  Truck,
} from 'lucide-react';
import { auth, useCollection, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query } from 'firebase/firestore';

// This is now a PURE function. It takes data as input and returns UI configuration.
// It contains no hooks and can be called anywhere.
const getNavLinksForRole = (role: Role, pendingCount: number = 0) => {
  let links: { href: string; label: string; icon: any; }[] = [];

  // Base links based on role
  switch (role) {
    case 'Farmer':
      links = [
        { href: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingCart },
        { href: '/dashboard/shipments/active', label: 'Active Shipments', icon: Package },
        { href: '/dashboard/shipments/create', label: 'New Shipment', icon: Wheat },
        { href: '/dashboard/transporters', label: 'Transporters', icon: Truck },
      ];
      break;
    case 'Transporter':
       links = [
         { href: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingCart },
         { href: '/dashboard/shipments/active', label: 'Active Shipments', icon: Package },
      ];
      break;
    case 'Industry':
      links = [
        { href: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingCart },
        { href: '/dashboard/shipments/active', label: 'Active Shipments', icon: Package },
        { href: '/dashboard/transporters', label: 'Transporters', icon: Truck },
      ];
      break;
    case 'Government':
      links = [
        { href: '/dashboard/oversight', label: 'Oversight', icon: Landmark },
        { href: '/dashboard/kyc-approval', label: `KYC Approval (${pendingCount})`, icon: UserCheck },
      ];
      break;
    case 'Admin':
      links = [
        { href: '/admin', label: `Pending Approvals (${pendingCount})`, icon: UserCheck },
      ];
      break;
    case 'Oracle':
      links = [
        { href: '/dashboard/oracle', label: 'Oracle Console', icon: DatabaseZap },
      ];
      break;
    default:
      links = [];
      break;
  }

  // Add common links
  if (role !== 'Government' && role !== 'Admin' && role !== 'Oracle') {
    links.unshift({ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard });
  }
  
  if (role !== 'Admin') {
      links.push({ href: '/dashboard/disputes', label: 'Disputes', icon: ShieldAlert });
  }

  return links;
};

export function DashboardSidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const firestore = useFirestore();

  // Safety check: if user is somehow null, render nothing
  if (!user || !user.role) {
    return null;
  }

  // Hooks are now correctly called at the top level of the React component.
  const { data: pendingApprovals } = useCollection(
    (user.role === 'Admin' || user.role === 'Government')
      ? query(collection(firestore, 'pendingApprovals'))
      : null // The hook is disabled if the user is not an Admin or Government, respecting hook rules.
  );
    
  const plainUserIds = pendingApprovals?.map(p => p.userId) || [];
  const pendingCount = new Set(plainUserIds).size;

  // The pure function is called with the result of the hooks.
  const allLinks = getNavLinksForRole(user.role, pendingCount);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <Sidebar side="left" collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-16 justify-center border-b">
        <div className="flex items-center gap-2">
            <AppLogo />
            <span className="font-headline text-xl font-bold group-data-[collapsible=icon]:hidden">
                AgriChain
            </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
           {allLinks.map(link => {
            const isActive = (link.href === '/dashboard' && pathname === '/dashboard') || 
                           (link.href !== '/dashboard' && pathname.startsWith(link.href));

            return (
              <SidebarMenuItem key={link.href}>
                <Link href={link.href} passHref>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={link.label}
                    className="font-headline"
                  >
                    <link.icon />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
         <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/dashboard/profile" passHref>
                <SidebarMenuButton
                  isActive={pathname.startsWith('/dashboard/profile')}
                  tooltip="Profile"
                  className="font-headline"
                >
                  <UserIcon />
                  <span>Profile</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <UserNav user={user} />
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="font-headline">
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
