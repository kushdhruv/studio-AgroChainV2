
import { useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { User as AppUser } from '@/lib/types';
import { User as FirebaseUser } from 'firebase/auth';

// The new, simplified state of authentication.
interface AuthState {
  firebaseUser: FirebaseUser | null;
  profile: AppUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  error: Error | null;
}

// Type guard to ensure we are dealing with a Firebase user object.
const isFirebaseUser = (user: any): user is FirebaseUser => {
  return user && typeof user.providerId === 'string';
};

/**
 * The definitive, simplified authentication hook for the entire application.
 * Authentication is now based purely on a Firebase session and a corresponding user profile in Firestore.
 * All wallet-connection logic has been removed to decouple authentication from the blockchain state.
 */
export const useAuth = (): AuthState => {
  const { user: userFromHook, isUserLoading: isFirebaseUserLoading, userError } = useUser();
  const firestore = useFirestore();

  const firebaseUser = isFirebaseUser(userFromHook) ? userFromHook : null;

  // Since all users are now stored with a standard `uid` field, we only need this one simple query.
  const profileQuery = useMemo(() => 
    firebaseUser ? query(collection(firestore, 'users'), where('uid', '==', firebaseUser.uid)) : null,
    [firestore, firebaseUser]
  );

  const { data: profiles, isLoading: isProfileLoading, error: profileError } = useCollection<AppUser>(profileQuery);
  
  // The user's profile is the first result from the query.
  const profile = useMemo(() => (profiles && profiles.length > 0 ? profiles[0] : null), [profiles]);

  const isAuthLoading = isFirebaseUserLoading || isProfileLoading;

  // Authentication is now simple, robust, and unambiguous.
  const isAuthenticated = !isAuthLoading && !!firebaseUser && !!profile;

  const error = userError || profileError;

  return {
    firebaseUser,
    profile,
    isAuthenticated,
    isAuthLoading,
    error,
  };
};
