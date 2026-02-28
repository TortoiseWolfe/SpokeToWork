'use client';

import React, { useState, useEffect } from 'react';
import SignUpForm from '@/components/auth/SignUpForm';
import OAuthButtons from '@/components/auth/OAuthButtons';
import AuthPageShell from '@/components/organisms/AuthPageShell';
import RoleToggle from '@/components/molecular/RoleToggle';
import Link from 'next/link';
import type { RequestableRole } from '@/contexts/AuthContext';

export default function SignUpPage() {
  const [returnUrl, setReturnUrl] = useState('/profile');
  const [requestedRole, setRequestedRole] = useState<RequestableRole>('worker');

  useEffect(() => {
    // Read query params client-side for static export compatibility
    const params = new URLSearchParams(window.location.search);
    const url = params.get('returnUrl');
    if (url) {
      // Only allow relative URLs to prevent open redirect attacks
      const isRelative = url.startsWith('/') && !url.startsWith('//');
      if (isRelative) {
        setReturnUrl(url);
      }
    }
    const role = params.get('role');
    if (role === 'worker' || role === 'employer') {
      setRequestedRole(role);
    }
  }, []);

  return (
    <AuthPageShell>
      <h1 className="mb-6 text-3xl font-bold">Create Account</h1>

      <RoleToggle
        value={requestedRole}
        onChange={setRequestedRole}
        className="mb-6"
      />

      <OAuthButtons requestedRole={requestedRole} layout="row" />

      <div className="divider my-6 text-xs opacity-70">
        or continue with email
      </div>

      <SignUpForm
        requestedRole={requestedRole}
        onSuccess={() => (window.location.href = '/verify-email')}
      />

      <p className="mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link
          href={`/sign-in${returnUrl !== '/profile' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
          className="link-primary"
        >
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
