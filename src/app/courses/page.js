import { formatStrapiCourses } from '@/lib/strapiUtils';
import { getCourses } from '@/lib/api'; // Import from centralized API layer
import CourseGrid from '@/modules/courses/CourseGrid/CourseGrid';
import styles from '../articles/articles.module.scss'; // Reusing styles

export const metadata = {
  title: 'دوره‌ها | وب‌سایت ما',
  description: 'لیست کامل دوره‌های آموزشی را مشاهده کنید.',
};

const PAGE_SIZE = 6;

/**
 * Fetches initial courses from centralized API layer
 * 
 * Refactored to use src/lib/api.js per ARCHITECTURE_RULES.md Rule 2.2
 * - No direct fetch() calls in components
 * - All API logic centralized in api.js
 * - Returns { data, error } format from API layer
 * - Handles data formatting with strapiUtils
 * 
 * @returns {Promise<Array>} Formatted array of course objects
 */
async function getInitialCourses() {
  try {
    /**
     * Call centralized API function instead of direct fetch
     * - getCourses handles URL construction
     * - getCourses handles query parameters (sort, pagination, populate)
     * - getCourses handles error scenarios
     * - Returns standardized { data, error } format
     */
    const { data, error } = await getCourses({
      sort: 'createdAt:desc',
      page: 1,
      pageSize: PAGE_SIZE
    });

    // Check for API errors
    if (error) {
      console.error("API Error fetching initial courses:", error);
      return [];
    }

    // Validate data structure
    if (!data) {
      console.warn("No data returned from courses API");
      return [];
    }

    /**
     * Format the raw Strapi response
     * - data contains the raw Strapi response: { data: [...], meta: {...} }
     * - formatStrapiCourses transforms it into clean course objects
     */
    const formattedCourses = formatStrapiCourses(data);
    
    return formattedCourses;
    
  } catch (error) {
    // Catch any unexpected errors
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