
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


type WithId<T> = T & { id: string };


export interface UseDocResult<T> {
  data: WithId<T> | null; 
  isLoading: boolean;       
  error: FirestoreError | Error | null; 
}


const getDocPath = (ref: DocumentReference<DocumentData> | null | undefined): string | null => {
    return ref ? ref.path : null;
};


export function useDoc<T = any>(
  docRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {

  const docPath = useMemo(() => getDocPath(docRef), [docRef]);

  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!docPath);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!docPath) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      docRef!, 
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: docPath,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [docPath]); 

  return { data, isLoading, error };
}
