/**
 * @file src/app/admin/top-banner/page.jsx
 * @description صفحه مدیریت نوار اعلان و تخفیف بالای هدر سایت در پنل ادمین
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminTopBanner } from '@/lib/admin/adminTopBannerApi';
import TopBannerManager from '@/components/admin/TopBanner/TopBannerManager';

export const metadata = {
  title: 'مدیریت نوار اعلان و تخفیف | پنل مدیریت',
  description: 'تنظیمات نوار اعلان و تخفیف سراسری بالای سایت',
  robots: { index: false, follow: false },
};

export default async function AdminTopBannerPage() {
  const session = await getServerSession(authOptions);
  const jwt = session?.user?.jwt;

  let initialBanner = null;
  if (jwt) {
    initialBanner = await getAdminTopBanner(jwt);
  }

  return <TopBannerManager initialBanner={initialBanner} />;
}
