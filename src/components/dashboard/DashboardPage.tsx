'use client';

import type { User as AppUser, Shipment, PendingApproval } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, ShoppingCart, Truck, Landmark, Package, Search } from 'lucide-react';
import { ShipmentCard } from '@/components/marketplace/ShipmentCard';
import { AdminDashboard } from '../admin/AdminDashboard';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '../common/PageHeader';
import { OracleDashboard } from '../oracle/OracleDashboard';
import { GovernmentDashboard } from '../government/GovernmentDashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
// ProposeWeighmentDialog (weighment proposals) has been removed from the main dashboard.

const statusColors: { [key in Shipment['status']]: string } = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    OfferMade: "bg-cyan-100 text-cyan-800 border-cyan-300",
    AwaitingPayment: "bg-orange-100 text-orange-800 border-orange-300",
    ReadyForPickup: "bg-blue-100 text-blue-800 border-blue-300",
    "In-Transit": "bg-indigo-100 text-indigo-800 border-indigo-300",
    Claimed: "bg-amber-100 text-amber-800 border-amber-300",
    Delivered: "bg-green-100 text-green-800 border-green-300",
    Verified: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Cancelled: "bg-red-100 text-red-800 border-red-300",
    Disputed: "bg-purple-100 text-purple-800 border-purple-300",
};

export function DashboardPage({ user, shipments, pendingApprovals }: { user: AppUser, shipments: Shipment[], pendingApprovals: PendingApproval[] }) {
  const farmerShipments = shipments.filter(s => s.farmerId === user.uid);
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
        <h3 className="font-headline text-2xl font-bold mb-4">Your Recent Active Shipments</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {transporterShipments.length > 0 ? transporterShipments.slice(0,3).map(shipment => (
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

        <div>
            <h3 className="font-headline text-2xl font-bold mb-4">Your Recent Listings</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {transporterShipments.length > 0 ? transporterShipments.slice(0,3).map(shipment => (
                    <ShipmentCard key={shipment.id} shipment={shipment} />
                )) : <p>You haven't transported any shipments yet.</p>}
            </div>
        </div>

        <Card>
            <CardHeader>
            <CardTitle className="font-headline">In-Transit Shipments</CardTitle>
            <CardDescription>Shipments currently in transit.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Shipment ID</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {transporterShipments.length > 0 ? transporterShipments.map(shipment => (
                    <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipment.id.slice(0,10)}...</TableCell>
                    <TableCell>{shipment.content}</TableCell>
                    <TableCell>{shipment.origin} {shipment.destination ? `→ ${shipment.destination}` : ''}</TableCell>
                    <TableCell><Badge className={statusColors[shipment.status]}>{shipment.status}</Badge></TableCell>
          <TableCell className="text-right">
            {/* Propose-weighment flow removed; weighments are attached via Oracle console only */}
          </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No in-transit shipments found.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
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
        <div>
            <h3 className="font-headline text-2xl font-bold mb-4">Your Recent Listings</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {industryShipments.length > 0 ? industryShipments.slice(0,3).map(shipment => (
                    <ShipmentCard key={shipment.id} shipment={shipment} />
                )) : <p>You haven't accepted any shipments yet.</p>}
            </div>
        </div>
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
        <OracleDashboard shipments={shipments} />
      </div>
    </>
  );

  const GovernmentDashboardView = () => {
    // Transform PendingApproval[] to the User[] that GovernmentDashboard expects
    const initialUsers: AppUser[] = pendingApprovals.map(approval => ({
      uid: approval.userId,
      name: approval.name,
      email: approval.email,
      role: approval.role,
      details: approval.details,
      kycVerified: false, // By definition, these users are pending approval
    }));

    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Government Console</PageHeaderHeading>
          <PageHeaderDescription>Approve KYC for new participants.</PageHeaderDescription>
        </PageHeader>
        <div className="p-4 sm:p-6 md:p-8">
          <GovernmentDashboard initialUsers={initialUsers} />
        </div>
      </>
    );
  };

  switch (user.role) {
    case 'Farmer':
      return <FarmerDashboard />;
    case 'Transporter':
      return <TransporterDashboard />;
    case 'Industry':
      return <IndustryDashboard />;
    case 'Government':
      return <GovernmentDashboardView />;
    case 'Admin':
      return <AdminDashboardView />;
    case 'Oracle':
        return <OracleDashboardView />;
    default:
      return <div>Welcome! Your dashboard is being set up.</div>;
  }
}
