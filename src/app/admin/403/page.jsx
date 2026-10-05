import AdminForbidden from '@/components/admin/Shared/AdminForbidden';

export const metadata = {
    title: 'عدم دسترسی | پنل مدیریت',
    robots: { index: false, follow: false },
};

export default function AdminForbiddenPage() {
    return <AdminForbidden />;
}
