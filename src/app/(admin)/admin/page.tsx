import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/common/PageHeader';

export default function AdminPage() {
  return (
    <div>
      <PageHeader>
        <PageHeaderHeading>Admin Console</PageHeaderHeading>
        <PageHeaderDescription>Manage trusted participants and platform settings.</PageHeaderDescription>
      </PageHeader>
      <div className="p-4 sm:p-6 md:p-8">
        <AdminDashboard />
      </div>
    </div>
  );
}
