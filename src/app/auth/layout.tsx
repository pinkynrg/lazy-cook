import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Lazy Cook - Authentication',
  description: 'Login or register to access Lazy Cook',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
