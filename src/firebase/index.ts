'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectAuthEmulator } from "firebase/auth";

// ✅ Ensure single initialization, with correct typing
const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ✅ Export singletons
export const app = firebaseApp;
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

if (process.env.NODE_ENV === "development") {
  connectFirestoreEmulator(firestore, "127.0.0.1", 8081);
  connectAuthEmulator(auth, "http://127.0.0.1:9098");
  console.log("✅ Connected to Firebase local emulators");
}

// ✅ Optional helper if you need them grouped
export function getSdks() {
  return { firebaseApp: app, auth, firestore, storage };
}

export function initializeFirebase() {
  return {
    firebaseApp: app,
    auth,
    firestore,
    storage,
  };
}

// ✅ Re-exports for other Firebase utilities
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
