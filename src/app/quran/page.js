/**
 * @file src/app/quran/page.js
 * @description صفحه اصلی قرآن کریم با عنوان «کلام نور» شامل فهرست ۱۱۴ سوره و تفاسیر اختصاصی.
 */

import { getAllTafsirSurahsSummary } from '@/lib/tafsirApi';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import QuranDirectory from '@/modules/quran/QuranDirectory/QuranDirectory';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'کلام نور | فهرست سوره‌ها و تفاسیر قرآن کریم',
  description: 'فهرست کامل ۱۱۴ سوره قرآن کریم همراه با متن، ترجمه فارسی، قرائت قاریان برجسته و تفاسیر اختصاصی طرح الهی.',
  alternates: {
    canonical: `${SITE_URL}/quran`,
  },
  openGraph: {
    title: `کلام نور | ${SITE_NAME}`,
    description: 'فهرست کامل ۱۱۴ سوره قرآن کریم همراه با متن، ترجمه فارسی و تفاسیر اختصاصی طرح الهی.',
    url: `${SITE_URL}/quran`,
    siteName: SITE_NAME,
    locale: 'fa_IR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `کلام نور | ${SITE_NAME}`,
    description: 'فهرست ۱۱۴ سوره قرآن کریم و تفاسیر اختصاصی طرح الهی.',
  },
};

export default async function QuranPage() {
  // واکشی خلاصه وضعیت تفاسیر از Strapi
  const tafsirSurahs = await getAllTafsirSurahsSummary();

  const breadcrumbItems = [
    { label: 'خانه', href: '/' },
    { label: 'کلام نور', href: '/quran' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'کلام نور - قرآن کریم و تفاسیر اختصاصی',
    description: 'فهرست ۱۱۴ سوره قرآن کریم با متن عربی، ترجمه فارسی و تفسیر اختصاصی',
    url: `${SITE_URL}/quran`,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <main className={styles.main}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container">
        {/* مسیر ناوبری (Breadcrumb) */}
        <Breadcrumb items={breadcrumbItems} />

        {/* دایرکتوری اصلی کلام نور */}
        <QuranDirectory tafsirSurahs={tafsirSurahs} />
      </div>
    </main>
  );
}
