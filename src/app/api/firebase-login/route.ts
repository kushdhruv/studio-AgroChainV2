import { NextResponse } from 'next/server';
import { recoverMessageAddress } from 'viem';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(req: Request) {
  try {
    const { address, message, signature } = await req.json();

    // Verify wallet ownership
    const recovered = await recoverMessageAddress({ message, signature });
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }

    // Create custom Firebase token
    const token = await admin.auth().createCustomToken(address);
    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Firebase login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
