import ProfileForm from '@/components/profile/ProfileForm';

export const metadata = {
    title: 'پروفایل کاربری',
    description: 'مدیریت اطلاعات حساب کاربری',
    robots: { index: false, follow: false },
};

export default function ProfilePage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', width: '100%' }}>
            <ProfileForm />
        </div>
    );
}
