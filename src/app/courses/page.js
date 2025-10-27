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

import CourseGrid from '@/modules/courses/CourseGrid/CourseGrid';
import { getCoursesPaginated } from '@/lib/coursesApi';
import styles from '../articles/articles.module.scss'; // Reusing styles

export const metadata = {
  title: 'دوره‌ها | وب‌سایت ما',
  description: 'لیست کامل دوره‌های آموزشی را مشاهده کنید.',
};

/**
 * Courses Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getCoursesPaginated() برای واکشی صفحه اول با pagination
 * - PAGE_SIZE = 6 (فقط 6 دوره در بارگذاری اولیه)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with initial course data
 */
export default async function CoursesPage() {
  // واکشی صفحه اول دوره‌ها با pagination
  // فقط 6 دوره اول مرتب‌شده بر اساس تاریخ ایجاد
  const result = await getCoursesPaginated(1, 6, 'createdAt:desc');
  const initialCourses = result.data;
  
  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>دوره‌ها</h1>
        </header>
        <CourseGrid initialCourses={initialCourses} />
      </div>
    </main>
  );
}