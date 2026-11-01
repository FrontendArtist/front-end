/**
 * @file src/app/quran/page.js
 * @description صفحه اصلی قرآن کریم با عنوان «کلام نور» شامل فهرست سوره‌ها، تفاسیر اختصاصی و تفسیر موضوعی.
 */

import { getAllTafsirSurahsSummary, getAllQuranSubjects } from '@/lib/tafsirApi';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import QuranDirectory from '@/modules/quran/QuranDirectory/QuranDirectory';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'کلام نور | فهرست سوره‌ها، تفاسیر اختصاصی و تفسیر موضوعی قرآن کریم',
  description: 'فهرست کامل ۱۱۴ سوره قرآن کریم همراه با متن، ترجمه فارسی، قرائت قاریان برجسته، تفاسیر اختصاصی و تفسیر موضوعی طرح الهی.',
  alternates: {
    canonical: `${SITE_URL}/quran`,
  },
  openGraph: {
    title: `کلام نور | ${SITE_NAME}`,
    description: 'فهرست کامل ۱۱۴ سوره قرآن کریم همراه با متن، ترجمه فارسی، تفاسیر اختصاصی و تفسیر موضوعی طرح الهی.',
    url: `${SITE_URL}/quran`,
    siteName: SITE_NAME,
    locale: 'fa_IR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `کلام نور | ${SITE_NAME}`,
    description: 'فهرست ۱۱۴ سوره قرآن کریم، تفاسیر اختصاصی و تفسیر موضوعی طرح الهی.',
  },
};

export default async function QuranPage() {
  // واکشی خلاصه وضعیت تفاسیر سوره‌ها و لیست موضوعات از Strapi
  const [tafsirSurahs, quranSubjects] = await Promise.all([
    getAllTafsirSurahsSummary(),
    getAllQuranSubjects(),
  ]);

  const breadcrumbItems = [
    { label: 'خانه', href: '/' },
    { label: 'کلام نور', href: '/quran' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'کلام نور - قرآن کریم، تفاسیر اختصاصی و تفسیر موضوعی',
    description: 'فهرست ۱۱۴ سوره قرآن کریم با متن عربی، ترجمه فارسی، تفسیر اختصاصی و تفسیر موضوعی',
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
        <QuranDirectory
          tafsirSurahs={tafsirSurahs}
          quranSubjects={quranSubjects}
        />
      </div>
    </main>
  );
}
