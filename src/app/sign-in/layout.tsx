import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - SpokeToWork',
  description: 'Sign in to your SpokeToWork account',
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
