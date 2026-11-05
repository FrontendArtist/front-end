/**
 * @file src/app/admin/salek-guide/page.jsx
 * @description صفحه مدیریت مسکات تعاملی راهنمای سالک در پنل ادمین
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminSalekGuide } from '@/lib/admin/adminSalekGuideApi';
import SalekGuideManager from '@/components/admin/SalekGuide/SalekGuideManager';

export const metadata = {
  title: 'مدیریت راهنمای سالک | پنل مدیریت',
  description: 'تنظیمات مسکات تعاملی و پیام دعوت به نقشه راه در سایت',
  robots: { index: false, follow: false },
};

export default async function AdminSalekGuidePage() {
  const session = await getServerSession(authOptions);
  const jwt = session?.user?.jwt;

  let initialGuide = null;
  if (jwt) {
    initialGuide = await getAdminSalekGuide(jwt);
  }

  return <SalekGuideManager initialGuide={initialGuide} />;
}
