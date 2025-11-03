'use client';

import type { User as AppUser, Shipment } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, ShoppingCart, Truck, Landmark, Package, Search } from 'lucide-react';
import { ShipmentCard } from '@/components/marketplace/ShipmentCard';
import { AdminDashboard } from '../admin/AdminDashboard';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '../common/PageHeader';
import { OracleDashboard } from '../oracle/OracleDashboard';

interface PendingApproval {
  id: string;
  userId: string;
  name: string;
  role: AppUser['role'];
  date: string;
}

export function DashboardPage({ user, shipments, pendingApprovals }: { user: AppUser, shipments: Shipment[], pendingApprovals: PendingApproval[] }) {
  const farmerShipments = shipments.filter(s => s.farmerId === user.uid);
  // For Transporter, the main `shipments` prop is already filtered to their active shipments
  const transporterShipments = shipments;
  const industryShipments = shipments.filter(s => s.industryId === user.uid);
  const industryActiveShipments = industryShipments.filter(s => ['AwaitingPayment', 'ReadyForPickup', 'In-Transit'].includes(s.status));

  const FarmerDashboard = () => (
    <>
      <PageHeader>
        <PageHeaderHeading>Welcome, {user.name}!</PageHeaderHeading>
        <PageHeaderDescription>Manage your shipments and list new produce.</PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle className="font-headline">Ready to sell?</CardTitle>
                <CardDescription>List your agricultural produce or waste on the AgriChain marketplace.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/dashboard/shipments/create"><PlusCircle className="mr-2 h-4 w-4" />Create New Shipment</Link>
                </Button>
            </CardContent>
            </Card>
            <Card>
            <CardHeader>
                <CardTitle className="font-headline">Track Your Shipments</CardTitle>
                <CardDescription>View shipments that have been accepted and are in progress.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                <Link href="/dashboard/shipments/active"><Package className="mr-2 h-4 w-4" />View Active Shipments</Link>
                </Button>
            </CardContent>
            </Card>
        </div>
        <div>
            <h3 className="font-headline text-2xl font-bold mb-4">Your Recent Listings</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {farmerShipments.length > 0 ? farmerShipments.slice(0,3).map(shipment => (
                    <ShipmentCard key={shipment.id} shipment={shipment} />
                )) : <p>You haven't created any shipments yet.</p>}
            </div>
        </div>
      </div>
    </>
  );

  const TransporterDashboard = () => (
    <>
      <PageHeader>
        <PageHeaderHeading>Welcome, {user.name}!</PageHeaderHeading>
        <PageHeaderDescription>View your assigned shipments and update their status.</PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8 space-y-8">
        <h3 className="font-headline text-2xl font-bold mb-4">Your Active Shipments</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {transporterShipments.length > 0 ? transporterShipments.map(shipment => (
                <ShipmentCard key={shipment.id} shipment={shipment} />
                       )) : (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">You have no shipments that are ready for pickup or in-transit.</p>
                  <Button asChild variant="link">
                    <Link href="/dashboard/marketplace">Browse Marketplace</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>
         {transporterShipments.length > 3 && (
            <div className="text-center">
                <Button asChild variant="secondary">
                    <Link href="/dashboard/shipments/active">View All Active Shipments</Link>
                </Button>
            </div>
        )}
      </div>
    </>
  );

  const IndustryDashboard = () => (
    <>
      <PageHeader>
        <PageHeaderHeading>Welcome, {user.name}!</PageHeaderHeading>
        <PageHeaderDescription>Source agricultural resources and track your active shipments.</PageHeaderDescription>
      </PageHeader>
       <div className="p-4 sm:p-6 md:p-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle className="font-headline">Find Resources</CardTitle>
                <CardDescription>Browse the marketplace for available produce and waste.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/dashboard/marketplace"><ShoppingCart className="mr-2 h-4 w-4" />Go to Marketplace</Link>
                </Button>
            </CardContent>
            </Card>
            <Card>
            <CardHeader>
                <CardTitle className="font-headline">Track Your Purchases</CardTitle>
                <CardDescription>View shipments that you have accepted and are in progress.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                <Link href="/dashboard/shipments/active"><Package className="mr-2 h-4 w-4" />View Active Shipments</Link>
                </Button>
            </CardContent>
            </Card>
        </div>
        <div>
            <h3 className="font-headline text-2xl font-bold mb-4">Your Active Shipments</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {industryActiveShipments.length > 0 ? industryActiveShipments.slice(0,3).map(shipment => (
                    <ShipmentCard key={shipment.id} shipment={shipment} />
                  )) : (
                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">You have no active shipments in progress.</p>
                      <Button asChild variant="link">
                        <Link href="/dashboard/marketplace">Find Shipments to Purchase</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
        </div>
      </div>
    </>
  );

  const GovernmentDashboard = () => (
    <>
      <PageHeader>
        <PageHeaderHeading>Oversight Portal</PageHeaderHeading>
        <PageHeaderDescription>Access the Government Oversight Dashboard.</PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Supply Chain View</CardTitle>
            <CardDescription>Get a global, real-time view of all shipments and use AI-powered tools for analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/oversight"><Landmark className="mr-2 h-4 w-4" />Open Oversight Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
  
  const AdminDashboardView = () => (
    <>
      <PageHeader>
        <PageHeaderHeading>Admin Console</PageHeaderHeading>
        <PageHeaderDescription>Manage platform participants and settings.</PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8">
        <AdminDashboard />
      </div>
    </>
  );
  
  const OracleDashboardView = () => (
    <>
      <PageHeader>
        <PageHeaderHeading>Oracle Console</PageHeaderHeading>
       <PageHeaderDescription>Approve KYC for new participants and attach real-world data to shipments.</PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8">
        <OracleDashboard shipments={shipments} pendingApprovals={pendingApprovals}/>
      </div>
    </>
  );

  switch (user.role) {
    case 'Farmer':
      return <FarmerDashboard />;
    case 'Transporter':
      return <TransporterDashboard />;
    case 'Industry':
      return <IndustryDashboard />;
    case 'Government':
      return <GovernmentDashboard />;
    case 'Admin':
      return <AdminDashboardView />;
    case 'Oracle':
        return <OracleDashboardView />;
    default:
      return <div>Welcome! Your dashboard is being set up.</div>;
  }
}
