import DashboardShell from '@/components/shared/DashboardShell';

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell portal="guard">{children}</DashboardShell>;
}
