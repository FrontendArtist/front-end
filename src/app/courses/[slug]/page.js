/**
 * Course Single Page - Dynamic Route
 * 
 * Data fetched via API Layer abstraction (coursesApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO
 */

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import Accordion from '@/components/ui/Accordion/Accordion';
import { getCourseBySlug } from '@/lib/coursesApi';
import styles from './page.module.scss';

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

/**
 * Generate Dynamic Metadata for SEO
 * Uses API Layer abstraction
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const rawCourse = await getCourseBySlug(slug);

  if (!rawCourse) {
    return { title: 'دوره یافت نشد' };
  }

  return {
    title: `${rawCourse.title} | وب‌سایت ما`,
    description: rawCourse.shortDescription,
  };
}

/**
 * Course Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getCourseBySlug() from coursesApi.js (no direct fetch)
 * - Follows Repository Pattern for clean separation of concerns
 * - Handles invalid slugs with notFound()
 */
export default async function CoursePage({ params }) {
  const { slug } = await params;

  // Data fetched via API Layer abstraction
  const rawCourse = await getCourseBySlug(slug);

  if (!rawCourse) {
    notFound();
  }

  // Format the course data for display
  const course = {
    id: rawCourse.id,
    title: rawCourse.title,
    description: rawCourse.shortDescription,
    price: rawCourse.price,
    media: {
      url: rawCourse.image.url.startsWith('http') ? rawCourse.image.url : `${STRAPI_API_URL}${rawCourse.image.url}`,
      alt: rawCourse.image.alt,
    },
    curriculum: [], // Curriculum needs to be populated from Strapi if available
  };

  return (
    <main className={styles.coursePage}>
      <div className="container">
        <Breadcrumb items={[
          { label: 'خانه', href: '/' },
          { label: 'دوره‌ها', href: '/courses' },
          { label: course.title }
        ]} />

        <div className={styles.mainInfoGrid}>
          <div className={styles.mediaWrapper}>
            <Image
              src={course.media.url}
              alt={course.media.alt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div className={styles.details}>
            <h1 className={styles.title}>{course.title}</h1>
            <p className={styles.description}>{course.description}</p>
            <div className={styles.price}>
              {course.price.toman === 0 ? 'رایگان' : `${course.price.toman.toLocaleString()} تومان`}
            </div>
            <Link href="/checkout" className="card-button">
              ثبت‌نام در دوره
            </Link>
          </div>
        </div>

        {course.curriculum && course.curriculum.length > 0 && (
          <div className={styles.curriculumSection}>
            <h2 className={styles.sectionTitle}>سرفصل‌های دوره</h2>
            <Accordion items={course.curriculum} />
          </div>
        )}
      </div>
    </main>
  );
}