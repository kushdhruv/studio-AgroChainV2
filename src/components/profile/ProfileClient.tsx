
'use client';

import { useState } from 'react';
import type { User as AppUser } from '@/lib/types';
import { ProfileView } from './ProfileView';
import { ProfileForm } from './ProfileForm';

export function ProfileClient({ user }: { user: AppUser }) {
  const [isEditing, setIsEditing] = useState(!user.kycVerified);

  // Automatically open edit mode if KYC is not verified
  if (!user.kycVerified && !isEditing) {
    setIsEditing(true);
  }

  return (
    <div>
      {isEditing ? (
        <ProfileForm user={user} onFinished={() => setIsEditing(false)} />
      ) : (
        <ProfileView user={user} onEdit={() => setIsEditing(true)} />
      )}
    </div>
  );
}
