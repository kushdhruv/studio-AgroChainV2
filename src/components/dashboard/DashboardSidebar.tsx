'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User as AppUser } from '@/lib/types';
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
import { LayoutDashboard, ShoppingCart, Package, Wheat, Landmark, UserCheck, LogOut, User as UserIcon, ShieldAlert, DatabaseZap ,Truck} from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

const commonLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const roleLinks = {
  Farmer: [
    { href: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingCart },
    { href: '/dashboard/shipments/active', label: 'Active Shipments', icon: Package },
    { href: '/dashboard/shipments/create', label: 'New Shipment', icon: Wheat },
    { href: '/dashboard/transporters', label: 'Transporters', icon: Truck },
    { href: '/dashboard/disputes', label: 'Disputes', icon: ShieldAlert },
  ],
  Transporter: [
     { href: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingCart },
     { href: '/dashboard/shipments/active', label: 'Active Shipments', icon: Package },
     { href: '/dashboard/disputes', label: 'Disputes', icon: ShieldAlert },
  ],
  Industry: [
    { href: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingCart },
    { href: '/dashboard/shipments/active', label: 'Active Shipments', icon: Package },
    { href: '/dashboard/transporters', label: 'Transporters', icon: Truck },
    { href: '/dashboard/disputes', label: 'Disputes', icon: ShieldAlert },
  ],
  Government: [
    { href: '/dashboard/oversight', label: 'Oversight', icon: Landmark },
    { href: '/dashboard/transporters', label: 'Transporters', icon: Truck },
    { href: '/dashboard/disputes', label: 'Disputes', icon: ShieldAlert },
  ],
  Admin: [
    { href: '/admin', label: 'Admin Console', icon: UserCheck },
    { href: '/dashboard/disputes', label: 'Disputes', icon: ShieldAlert },
  ],
  Oracle: [
    { href: '/dashboard/oracle', label: 'Oracle Console', icon: DatabaseZap },
  ],
};

const bottomLinks = [
  { href: '/dashboard/profile', label: 'Profile', icon: UserIcon },
];

export function DashboardSidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    // Check if it's a regular Firebase user or an Oracle user (from localStorage)
    if (user.email.includes('@')) {
        await signOut(auth);
    } else {
        localStorage.removeItem('user');
    }
    router.push('/login');
  };

  const userLinks = user.role ? roleLinks[user.role] : [];
  const allLinks = user.role === 'Admin' ? userLinks : [...commonLinks, ...userLinks];

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
           {allLinks.map(link => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} passHref>
                <SidebarMenuButton
                  isActive={pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard')}
                  tooltip={link.label}
                  className="font-headline"
                >
                  <link.icon />
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
         <SidebarMenu>
             {bottomLinks.map(link => (
                <SidebarMenuItem key={link.href}>
                <Link href={link.href} passHref>
                    <SidebarMenuButton
                    isActive={pathname.startsWith(link.href)}
                    tooltip={link.label}
                    className="font-headline"
                    >
                    <link.icon />
                    <span>{link.label}</span>
                    </SidebarMenuButton>
                </Link>
                </SidebarMenuItem>
            ))}
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
