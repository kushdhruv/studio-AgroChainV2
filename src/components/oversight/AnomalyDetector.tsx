'use client';

import { useState } from 'react';
import type { Shipment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { checkForAnomalies } from '@/lib/actions';
import type { GovernmentOversightAnomalyDetectionOutput } from '@/ai/flows/government-oversight-anomaly-detection';
import { Bot, ThumbsDown, ThumbsUp } from 'lucide-react';

export function AnomalyDetector({ shipment }: { shipment: Shipment }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GovernmentOversightAnomalyDetectionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const response = await checkForAnomalies(shipment);
    if (response.success && response.data) {
      setResult(response.data);
    } else {
      setError(response.error || 'An unknown error occurred.');
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => !isOpen && handleAnalysis()}>
          <Bot className="mr-2 h-4 w-4" />
          Analyze
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="font-headline">AI Anomaly Analysis for {shipment.id}</DialogTitle>
          <DialogDescription>
            The model analyzes shipment data for route deviations, unusual state updates, and other patterns.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {loading && <div className="text-center">Analyzing...</div>}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {result && (
            <div>
              {result.anomalies && result.anomalies.length > 0 ? (
                <Alert>
                  <ThumbsDown className="h-4 w-4" />
                  <AlertTitle className="font-headline">Anomalies Detected!</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {result.anomalies.map((anomaly, i) => <li key={i}>{anomaly}</li>)}
                    </ul>
                    <h4 className="font-headline font-semibold mt-4 mb-2">Explanation:</h4>
                    <p>{result.explanation}</p>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="default" className="border-green-300 bg-green-50">
                  <ThumbsUp className="h-4 w-4" />
                  <AlertTitle className="font-headline text-green-800">No Anomalies Found</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {result.explanation || "The shipment data appears to be within normal parameters."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
