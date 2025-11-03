
'use server';

import {
  analyzeShipmentData,
  type GovernmentOversightAnomalyDetectionInput,
} from '@/ai/flows/government-oversight-anomaly-detection';
import type { Shipment } from '@/lib/types';
import pinataSDK from '@pinata/sdk';

export async function checkForAnomalies(shipment: Shipment) {
  'use server';
  try {
    const input: GovernmentOversightAnomalyDetectionInput = {
      shipmentData: JSON.stringify({
        id: shipment.id,
        origin: shipment.origin,
        destination: shipment.destination,
        status: shipment.status,
        timeline: shipment.timeline,
      }),
    };
    const result = await analyzeShipmentData(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error analyzing shipment data:', error);
    return { success: false, error: 'Failed to analyze shipment data.' };
  }
}

export async function uploadToIPFS(formData: FormData) {
  'use server';
  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, error: 'No file provided.' };
  }

  if (!process.env.PINATA_JWT) {
    console.error("Missing Pinata JWT in environment variables.");
    return { success: false, error: 'Server configuration error: Missing IPFS API key.' };
  }

  try {
    const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const stream = require('stream').Readable.from(fileBuffer);

    const result = await pinata.pinFileToIPFS(stream, {
        pinataMetadata: { name: file.name },
    });

    return { success: true, ipfsHash: result.IpfsHash };

  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    return { success: false, error: 'Failed to upload file to IPFS.' };
  }
}

export async function uploadJsonToIPFS(data: object) {
  'use server';
   if (!process.env.PINATA_JWT) {
    console.error("Missing Pinata JWT in environment variables.");
    return { success: false, error: 'Server configuration error: Missing IPFS API key.' };
  }

  try {
    const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
    const result = await pinata.pinJSONToIPFS(data);
    return { success: true, ipfsHash: result.IpfsHash };
  } catch (error) {
     console.error('Error uploading JSON to IPFS:', error);
    return { success: false, error: 'Failed to upload JSON to IPFS.' };
  }
}
