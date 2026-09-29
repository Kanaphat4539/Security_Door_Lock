import DashboardShell from '@/components/shared/DashboardShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell portal="admin">{children}</DashboardShell>;
}
