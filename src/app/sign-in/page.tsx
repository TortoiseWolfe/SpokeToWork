'use client';

import React, { useState, useEffect } from 'react';
import SignInForm from '@/components/auth/SignInForm';
import OAuthButtons from '@/components/auth/OAuthButtons';
import AuthPageShell from '@/components/organisms/AuthPageShell';
import Link from 'next/link';

// Get basePath for redirects (empty string in dev, '/SpokeToWork' in production)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function SignInPage() {
  const [returnUrl, setReturnUrl] = useState(`${basePath}/profile`);

  useEffect(() => {
    // Read query params client-side for static export compatibility
    const params = new URLSearchParams(window.location.search);
    const url = params.get('returnUrl');
    if (url) {
      // Only allow relative URLs to prevent open redirect attacks.
      // Reject absolute URLs (http://, https://, //) and protocol-relative URLs.
      const isRelative = url.startsWith('/') && !url.startsWith('//');
      if (isRelative) {
        const finalUrl = url.startsWith(basePath) ? url : `${basePath}${url}`;
        setReturnUrl(finalUrl);
      }
    }
  }, []);

  return (
    <AuthPageShell>
      <h1 className="mb-6 text-3xl font-bold">Sign In</h1>

      <OAuthButtons layout="row" />

      <div className="divider my-6 text-xs opacity-70">
        or continue with email
      </div>

      <SignInForm
        onSuccess={() => (window.location.href = decodeURIComponent(returnUrl))}
      />

      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="link-primary">
          Forgot password?
        </Link>
      </p>

      <p className="mt-6 text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link
          href={`/sign-up${returnUrl !== '/profile' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
          className="link-primary"
        >
          Sign up
        </Link>
      </p>
    </AuthPageShell>
  );
}
