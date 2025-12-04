import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - SpokeToWork',
  description: 'Create a new SpokeToWork account',
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
