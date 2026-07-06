import { redirect } from 'next/navigation';

export default function RootPage() {
  // The middleware should catch this and redirect to /login
  // This is a fallback
  redirect('/login');
}
