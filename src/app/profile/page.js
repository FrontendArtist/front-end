import ProfileForm from '@/components/profile/ProfileForm';
import OrdersList from '@/components/profile/OrdersList';

export const metadata = {
    title: 'پروفایل کاربری | پنل کاربری',
    description: 'مدیریت اطلاعات حساب کاربری',
};

export default function ProfilePage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', width: '100%' }}>
            <ProfileForm />
            
            {/* Recent Orders Section */}
            <div>
                <OrdersList limit={2} />
            </div>
        </div>
    );
}
