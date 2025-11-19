'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Shipment } from '@/lib/types';

interface PendingStateUpdate {
  id: string;
  shipmentId: string;
  shipmentIdOnChain: `0x${string}`;
  currentState: number;
  targetState: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  attemptCount: number;
  lastError?: string;
}

export function ShipmentStateUpdatesPanel({ shipments }: { shipments: Shipment[] }) {
  const { toast } = useToast();
  const [pendingUpdates, setPendingUpdates] = useState<PendingStateUpdate[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load pending updates from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pendingStateUpdates');
    if (stored) {
      try {
        setPendingUpdates(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse pending updates:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Save pending updates to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('pendingStateUpdates', JSON.stringify(pendingUpdates));
    }
  }, [pendingUpdates, isLoading]);

  const handleApproveStateUpdate = async (update: PendingStateUpdate) => {
    if (processingId) return; // Prevent multiple simultaneous submissions

    setProcessingId(update.id);
    try {
      toast({
        title: 'Processing State Update',
        description: 'Sending to blockchain...',
      });

      // Call the backend Oracle API to update state
      const response = await fetch('/api/oracle/update-shipment-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentId: update.shipmentIdOnChain,
          toState: update.targetState,
          timestamp: Math.floor(Date.now() / 1000),
          nonce: Date.now(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state to completed
        setPendingUpdates(prev =>
          prev.map(u =>
            u.id === update.id
              ? { ...u, status: 'completed' as const }
              : u
          )
        );

        toast({
          title: '✅ State Update Confirmed',
          description: `Transaction: ${result.transactionHash?.slice(0, 10)}...`,
        });
      } else {
        // Mark as failed
        setPendingUpdates(prev =>
          prev.map(u =>
            u.id === update.id
              ? {
                  ...u,
                  status: 'failed' as const,
                  lastError: result.error,
                  attemptCount: u.attemptCount + 1,
                }
              : u
          )
        );

        toast({
          variant: 'destructive',
          title: 'State Update Failed',
          description: result.error || 'Unknown error',
        });
      }
    } catch (error: any) {
      console.error('Error approving state update:', error);

      setPendingUpdates(prev =>
        prev.map(u =>
          u.id === update.id
            ? {
                ...u,
                status: 'failed' as const,
                lastError: error.message,
                attemptCount: u.attemptCount + 1,
              }
            : u
        )
      );

      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetry = (update: PendingStateUpdate) => {
    // Reset status to pending for retry
    setPendingUpdates(prev =>
      prev.map(u =>
        u.id === update.id
          ? { ...u, status: 'pending' as const, lastError: undefined }
          : u
      )
    );
  };

  const handleDismiss = (updateId: string) => {
    setPendingUpdates(prev => prev.filter(u => u.id !== updateId));
  };

  const getStateLabel = (state: number) => {
    const states: { [key: number]: string } = {
      0: 'OPEN',
      1: 'ASSIGNED',
      2: 'IN_TRANSIT',
      3: 'DELIVERED',
      4: 'VERIFIED',
      5: 'PAID',
      6: 'DISPUTED',
      7: 'CANCELLED',
    };
    return states[state] || `STATE_${state}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Shipment State Updates</CardTitle>
          <CardDescription>Approve shipment state changes after escrow payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingUpdates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Shipment State Updates</CardTitle>
          <CardDescription>Approve shipment state changes after escrow payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center h-24 flex items-center justify-center">
            <p className="text-muted-foreground">No pending state updates at this time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Shipment State Updates</CardTitle>
        <CardDescription>
          Approve shipment state changes after escrow payment ({pendingUpdates.length} pending)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment ID</TableHead>
              <TableHead>Current State</TableHead>
              <TableHead>Target State</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUpdates.map(update => {
              const shipment = shipments.find(s => s.shipmentIdOnChain === update.shipmentIdOnChain);
              return (
                <TableRow key={update.id}>
                  <TableCell className="font-medium font-mono text-xs">
                    {update.shipmentId.slice(0, 10)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getStateLabel(update.currentState)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800">
                      {getStateLabel(update.targetState)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(update.status)}>
                      {update.status.charAt(0).toUpperCase() + update.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{update.attemptCount}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {update.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveStateUpdate(update)}
                        disabled={processingId === update.id}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {processingId === update.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </>
                        )}
                      </Button>
                    )}
                    {update.status === 'failed' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(update)}
                          disabled={processingId === update.id}
                        >
                          Retry
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(update.id)}
                        >
                          Dismiss
                        </Button>
                      </>
                    )}
                    {update.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(update.id)}
                      >
                        Clear
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {pendingUpdates.some(u => u.lastError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <AlertCircle className="inline mr-2 h-4 w-4" />
              Some updates failed. Click Retry to try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
