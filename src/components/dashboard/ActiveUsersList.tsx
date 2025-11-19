'use client';

import React from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
// **I HAVE CORRECTED THE COLUMN DEFINITIONS. THIS WAS THE CATASTROPHIC BUG.**
const userColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  {
    id: 'isApproved',
    accessorKey: 'isApproved',
    header: 'KYC Approved',
    // I am ensuring the cell renderer is robust to handle undefined or missing data.
    cell: ({ row }: any) => {
        const { isApproved } = row.original;
        if (isApproved === undefined || isApproved === null) {
            return 'N/A'; // Or some other placeholder
        }
        return isApproved ? 'Yes' : 'No';
    }
  },
];


const ActiveUsersList = () => {
  const firestore = useFirestore();
  const usersQuery = collection(firestore, 'users');
  const { data: users, isLoading, error } = useCollection<User>(usersQuery);

  if (isLoading) {
    return (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading users: {error.message}</div>;
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle>All Active Users</CardTitle>
        </CardHeader>
        <CardContent>
            <DataTable columns={userColumns} data={users || []} />
        </CardContent>
      </Card>
  );
};

export default ActiveUsersList;
