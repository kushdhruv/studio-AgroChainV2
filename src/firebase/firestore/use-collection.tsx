
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

const getQueryKey = (query: CollectionReference<DocumentData> | Query<DocumentData> | null | undefined): string | null => {
    if (!query) return null;
    if (query.type === 'collection') {
        return (query as CollectionReference).path;
    }
    return (query as unknown as InternalQuery)._query.path.canonicalString();
};

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    targetRefOrQuery: CollectionReference<DocumentData> | Query<DocumentData> | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const queryKey = useMemo(() => getQueryKey(targetRefOrQuery), [targetRefOrQuery]);

  // **THE FIX: Initialize isLoading based on the query's initial state.**
  // If there's no query on the first render, we aren't loading.
  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!queryKey);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // If the query key is null, it means the query is not ready. Reset state.
    if (!queryKey) {
      setData(null);
      setIsLoading(false); 
      setError(null);
      return;
    }

    // A valid query key exists, so we are now loading.
    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      targetRefOrQuery!,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false); // Finished loading
      },
      (error: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: queryKey,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false); // Finished loading (with an error)
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [queryKey]); // The effect now robustly depends on the stable query key.

  return { data, isLoading, error };
}
