/**
 * Courses Page - Main Listing Page
 * 
 * Data fetched via API Layer abstraction (coursesApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO and performance
 * 
 * جریان داده (Data Flow):
 * این صفحه → getCoursesPaginated() → apiClient → Strapi
 * فقط صفحه اول با تعداد محدود آیتم واکشی می‌شود
 * بقیه آیتم‌ها با دکمه "بارگذاری بیشتر" از سمت کلاینت واکشی می‌شوند
 */

import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import ListGuard from '@/components/ui/ListGuard/ListGuard';
import CourseGrid from '@/modules/courses/CourseGrid/CourseGrid';
import ServerErrorBlock from '@/components/ui/ServerErrorBlock/ServerErrorBlock';
import { getCoursesPaginated } from '@/lib/coursesApi';
import { unstable_noStore as noStore } from 'next/cache';
import styles from './page.module.scss';
import { SITE_NAME, SITE_URL, COURSES_PAGE_SIZE } from '@/lib/constants';

export const metadata = {
  title: 'دوره‌ها',
  description: 'لیست کامل دوره‌های آموزشی را مشاهده کنید.',
  openGraph: {
    title: `دوره‌ها | ${SITE_NAME}`,
    description: 'لیست کامل دوره‌های آموزشی را مشاهده کنید.',
    url: `${SITE_URL}/courses`,
  },
  alternates: {
    canonical: '/courses',
  }
};

/**
 * Courses Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getCoursesPaginated() برای واکشی صفحه اول با pagination
 * - PAGE_SIZE از lib/constants.js وارد می‌شود (Single Source of Truth)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with initial course data
 */
export default async function CoursesPage({ searchParams: spPromise }) {
  // واکشی صفحه اول دوره‌ها با pagination
  // تعداد دوره‌ها از COURSES_PAGE_SIZE در lib/constants.js
  const searchParams = await spPromise;
  const normalizedSearchParams =
    searchParams && typeof searchParams.entries === 'function'
      ? Object.fromEntries(searchParams.entries())
      : searchParams || {};
  const hasFilters = Object.keys(normalizedSearchParams).length > 0;
  const result = await getCoursesPaginated(1, COURSES_PAGE_SIZE, 'createdAt:desc');

  if (result.error === 'BACKEND_UNAVAILABLE') {
    noStore();
    return (
      <main className={styles.main}>
        <div className="container">
          <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'دوره‌ها' }]} />
          <ServerErrorBlock message="ارتباط با سرور دوره‌ها برقرار نشد" />
        </div>
      </main>
    );
  }

  const initialCourses = result.data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `دوره‌ها | ${SITE_NAME}`,
    "description": "لیست کامل دوره‌های آموزشی را مشاهده کنید.",
    "url": `${SITE_URL}/courses`,
  };

  return (
    <main className={styles.main}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container">
        <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'دوره‌ها' }]} />

        <ListGuard
          data={initialCourses}
          hasFilters={hasFilters}
          entityName="دوره"
          resetLink="/courses"
        >
          <CourseGrid initialCourses={initialCourses} initialMeta={result.meta} />
        </ListGuard>
      </div>
    </main>
  );
}
