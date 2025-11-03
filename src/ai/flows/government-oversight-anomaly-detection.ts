'use server';

/**
 * @fileOverview AI-powered anomaly detection for the Government Oversight Dashboard.
 *
 * - analyzeShipmentData - Analyzes shipment data and identifies potential anomalies.
 * - GovernmentOversightAnomalyDetectionInput - The input type for the analyzeShipmentData function.
 * - GovernmentOversightAnomalyDetectionOutput - The return type for the analyzeShipmentData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GovernmentOversightAnomalyDetectionInputSchema = z.object({
  shipmentData: z
    .string()
    .describe('JSON string of shipment data, including route, state updates, and other relevant information.'),
});
export type GovernmentOversightAnomalyDetectionInput = z.infer<
  typeof GovernmentOversightAnomalyDetectionInputSchema
>;

const GovernmentOversightAnomalyDetectionOutputSchema = z.object({
  anomalies: z
    .array(z.string())
    .describe(
      'A list of identified anomalies, such as route deviations or unusual state update patterns.'
    ),
  explanation: z
    .string()
    .describe('An explanation of why the anomalies were flagged.'),
});
export type GovernmentOversightAnomalyDetectionOutput = z.infer<
  typeof GovernmentOversightAnomalyDetectionOutputSchema
>;

export async function analyzeShipmentData(
  input: GovernmentOversightAnomalyDetectionInput
): Promise<GovernmentOversightAnomalyDetectionOutput> {
  return governmentOversightAnomalyDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'governmentOversightAnomalyDetectionPrompt',
  input: { schema: GovernmentOversightAnomalyDetectionInputSchema },
  output: { schema: GovernmentOversightAnomalyDetectionOutputSchema },
  prompt:
    'You are an AI assistant that analyzes shipment data for anomalies to detect inefficiencies or fraud in an agricultural supply chain.\n\n' +
    'Analyze the following shipment data provided as JSON:\n\n' +
    '```json\n' +
    '{{{shipmentData}}}\n' +
    '```\n\n' +
    'Identify any anomalies, such as:\n\n' +
    '* Route deviations from the expected path.\n' +
    '* Unusual patterns in state updates compared to similar shipments.\n' +
    '* Unexpected delays or accelerations in the shipment timeline.\n\n' +
    'Provide a list of the identified anomalies and an explanation of why they were flagged.\n\n' +
    'Output the result as a JSON object with "anomalies" and "explanation" fields.\n'
});

const governmentOversightAnomalyDetectionFlow = ai.defineFlow(
  {
    name: 'governmentOversightAnomalyDetectionFlow',
    inputSchema: GovernmentOversightAnomalyDetectionInputSchema,
    outputSchema: GovernmentOversightAnomalyDetectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
