/**
 * Courses Page - Main Listing Page
 * 
 * Data fetched via API Layer abstraction (coursesApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO and performance
 */

import CourseGrid from '@/modules/courses/CourseGrid/CourseGrid';
import { getAllCourses } from '@/lib/coursesApi';
import styles from '../articles/articles.module.scss'; // Reusing styles

export const metadata = {
  title: 'دوره‌ها | وب‌سایت ما',
  description: 'لیست کامل دوره‌های آموزشی را مشاهده کنید.',
};

/**
 * Courses Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getAllCourses() from coursesApi.js (no direct fetch)
 * - Follows Repository Pattern for clean separation of concerns
 * - SSR renders complete HTML with course data
 */
export default async function CoursesPage() {
  // Data fetched via API Layer abstraction
  const initialCourses = await getAllCourses();
  
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