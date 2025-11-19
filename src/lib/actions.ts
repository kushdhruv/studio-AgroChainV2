
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
  // Log presence of Pinata env vars (masked) to help debug missing/invalid config
  const mask = (v?: string) => {
    if (!v) return 'undefined';
    try {
      if (v.length <= 16) return `${v} (len=${v.length})`;
      return `${v.slice(0, 8)}...${v.slice(-8)} (len=${v.length})`;
    } catch {
      return 'masked';
    }
  };
  console.log('[IPFS] PINATA_JWT present:', !!process.env.PINATA_JWT, 'value:', mask(process.env.PINATA_JWT));
  console.log('[IPFS] NEXT_PUBLIC_PINATA_GATEWAY:', mask(process.env.NEXT_PUBLIC_PINATA_GATEWAY));
  console.log('[IPFS] NEXT_PUBLIC_PINATA_CUSTOM_GATEWAY:', mask(process.env.NEXT_PUBLIC_PINATA_CUSTOM_GATEWAY));

  if (!process.env.PINATA_JWT) {
    console.error("Missing Pinata JWT in environment variables.");
    return { success: false, error: 'Server configuration error: Missing IPFS API key.' };
  }

  try {
    const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const stream = require('stream').Readable.from(fileBuffer);

    // Sanitize file metadata to avoid control characters causing JSON errors in Pinata
    const sanitizeName = (n: string) => n.replace(/[\u0000-\u001F\u007F"\\]/g, '').trim();
    const sanitizedMetadata = { name: sanitizeName(file.name || 'upload') };

    const result = await pinata.pinFileToIPFS(stream, {
      pinataMetadata: sanitizedMetadata,
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

  // Log masked env var presence for debugging
  const mask = (v?: string) => {
    if (!v) return 'undefined';
    try {
      if (v.length <= 16) return `${v} (len=${v.length})`;
      return `${v.slice(0, 8)}...${v.slice(-8)} (len=${v.length})`;
    } catch {
      return 'masked';
    }
  };
  console.log('[IPFS] uploadJsonToIPFS PINATA_JWT present:', !!process.env.PINATA_JWT, 'value:', mask(process.env.PINATA_JWT));
  console.log('[IPFS] uploadJsonToIPFS NEXT_PUBLIC_PINATA_GATEWAY:', mask(process.env.NEXT_PUBLIC_PINATA_GATEWAY));

  // Sanitize the object by removing control characters from all string fields.
  const sanitize = (obj: any, seen = new WeakSet()): any => {
    if (obj == null) return obj;
    // Prevent circular recursion
    if (typeof obj === 'object') {
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);
    }

    if (typeof obj === 'string') {
      // Remove control characters (U+0000 - U+001F and U+007F)
      return obj.replace(/[\u0000-\u001F\u007F]/g, '');
    }

    if (typeof obj === 'bigint') {
      // Convert BigInt to string for JSON safety
      return obj.toString();
    }

    if (obj instanceof Date) return obj.toISOString();

    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {
      return obj.toString('base64');
    }

    if (obj instanceof Uint8Array) {
      return Buffer.from(obj).toString('base64');
    }

    if (Array.isArray(obj)) return obj.map((v) => sanitize(v, seen));

    if (typeof obj === 'object') {
      const out: any = {};
      for (const k of Object.keys(obj)) {
        try {
          out[k] = sanitize(obj[k], seen);
        } catch (e) {
          out[k] = String(obj[k]);
        }
      }
      return out;
    }

    // Functions, symbols, etc. -> string
    if (typeof obj === 'function' || typeof obj === 'symbol') return String(obj);

    return obj;
  };

  try {
    // Use direct fetch to Pinata's pinJSONToIPFS endpoint instead of SDK to avoid
    // any SDK-level serialization issues. We already sanitize the payload above.
    const sanitized = sanitize(data);
    const body = JSON.stringify(sanitized);
    const resp = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body,
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      console.error('[IPFS] pinJSONToIPFS failed:', resp.status, json);
      return { success: false, error: json?.error?.details || `Pinata error ${resp.status}` };
    }
    return { success: true, ipfsHash: json?.IpfsHash || json?.IpfsID || null };
  } catch (error) {
     console.error('Error uploading JSON to IPFS:', error);
    return { success: false, error: 'Failed to upload JSON to IPFS.' };
  }
}
