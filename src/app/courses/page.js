import { formatStrapiCourses } from '@/lib/strapiUtils';
import CourseGrid from '@/modules/courses/CourseGrid/CourseGrid';
import styles from '../articles/articles.module.scss'; // Reusing styles

export const metadata = {
  title: 'دوره‌ها | وب‌سایت ما',
  description: 'لیست کامل دوره‌های آموزشی را مشاهده کنید.',
};

const PAGE_SIZE = 6;

async function getInitialCourses() {
  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
  try {
    // We added '&populate=media' to fetch the cover image for each course
    const response = await fetch(
      `${STRAPI_API_URL}/api/courses?populate=media&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=${PAGE_SIZE}`
    );
    if (!response.ok) throw new Error('Failed to fetch initial courses');
    const result = await response.json();
    return formatStrapiCourses(result, STRAPI_API_URL);
  } catch (error) {
    console.error("Initial Courses Fetch Error:", error);
    return [];
  }
}

export default async function CoursesPage() {
  const initialCourses = await getInitialCourses();
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