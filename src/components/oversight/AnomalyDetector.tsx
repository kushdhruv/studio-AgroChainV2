'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { runFlow } from '@genkit-ai/next/client';
import { BrainCircuit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import type { Shipment } from '@/lib/types';

// Define the expected shape of the analysis result
interface AnomalyResult {
  isAnomaly: boolean;
  anomalyType: string;
  explanation: string;
}

export function AnomalyDetector({ shipment }: { shipment: Shipment }) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState<AnomalyResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleAnalysis = async () => {
    // Reset state and open the dialog
    setRunning(true);
    setError(null);
    setValue(null);
    setIsOpen(true);

    try {
      // Correctly call the flow with the API URL and input
      const result = await runFlow({
        url: '/api/flows/government-oversight-anomaly-detection',
        input: shipment,
      });
      setValue(result);
    } catch (e: any) {
      setError(e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleAnalysis}>
          <BrainCircuit className="mr-2 h-4 w-4" />
          Analyze
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Anomaly Analysis</DialogTitle>
          <DialogDescription>
            Shipment ID: <span className="font-mono">{shipment.id}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {running && <p>Analyzing shipment data...</p>}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Analysis Error</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {value && (
            <div className="space-y-2">
              <p className="font-semibold">Analysis Result:</p>
              <div className={`p-4 rounded-md ${value.isAnomaly ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'}`}>
                <div className="flex items-center gap-4">
                    <Badge variant={value.isAnomaly ? 'destructive' : 'default'}>
                        {value.isAnomaly ? 'Anomaly Detected' : 'No Anomaly'}
                    </Badge>
                    <p className="font-semibold">{value.anomalyType || 'N/A'}</p>
                </div>
                <p className="mt-2 text-sm text-gray-700">{value.explanation}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
