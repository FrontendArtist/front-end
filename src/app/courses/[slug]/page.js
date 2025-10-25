import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Accordion from '@/components/ui/Accordion/Accordion';
import { getCourseBySlug as fetchCourseBySlug, getCourses } from '@/lib/api'; // Import from centralized API layer
import { getStrapiURL } from '@/lib/strapiUtils';
import styles from './page.module.scss';

/**
 * Fetches a single course by slug from centralized API layer
 * 
 * Refactored to use src/lib/api.js per ARCHITECTURE_RULES.md Rule 2.2
 * - No direct fetch() calls in components
 * - All API logic centralized in api.js
 * - Returns { data, error } format from API layer
 * 
 * @param {string} slug - Course slug identifier
 * @returns {Promise<Object|null>} Formatted course object or null if not found
 */
async function getCourseBySlug(slug) {
  try {
    /**
     * Call centralized API function
     * - Handles URL construction and query parameters
     * - Implements ISR revalidation strategy
     * - Returns standardized { data, error } format
     */
    const { data, error } = await fetchCourseBySlug(slug);

    // Check for API errors
    if (error) {
      console.error("API Error fetching course:", error);
      return null;
    }

    // Validate data exists
    if (!data || !data.data || data.data.length === 0) {
      console.warn(`No course found with slug: ${slug}`);
      return null;
    }

    // Extract the raw course data (Strapi returns array for filters)
    const rawCourse = data.data[0];
    
    /**
     * Format course media/image
     * - Courses use 'media' array field
     * - Take first item as primary image
     * - Provide fallback placeholder if missing
     */
    let courseMedia = { 
      url: 'https://picsum.photos/seed/placeholder/800/450', 
      alt: 'Placeholder', 
      width: 800, 
      height: 450 
    };
    
    if (rawCourse.media && rawCourse.media.length > 0) {
      const firstMedia = rawCourse.media[0];
      courseMedia = {
        // Use getStrapiURL for consistent URL handling
        url: firstMedia.url.startsWith('http') 
          ? firstMedia.url 
          : getStrapiURL(firstMedia.url),
        alt: firstMedia.alternativeText || '',
        width: firstMedia.width || 800,
        height: firstMedia.height || 450,
      };
    }
    
    /**
     * Extract description from Strapi rich text structure
     * - description is array of blocks
     * - Get text from first block's first child
     */
    const descriptionText = (rawCourse.description && rawCourse.description[0]?.children[0]?.text) || '';

    /**
     * Format and return course object
     * - Map curriculum items to expected format
     * - Ensure all fields have proper fallbacks
     */
    return {
      id: rawCourse.id,
      title: rawCourse.title,
      description: descriptionText,
      price: { toman: rawCourse.price || 0 },
      // Map curriculum array to clean format for Accordion component
      curriculum: (rawCourse.curriculum || []).map(item => ({ 
        id: item.id, 
        title: item.title, 
        content: item.content 
      })),
      media: courseMedia,
    };
    
  } catch (error) {
    console.error("Failed to fetch course by slug:", error);
    return null;
  }
}

/**
 * Generate static params for all courses at build time
 * 
 * Refactored to use centralized API layer
 * - Fetches all courses to extract slugs
 * - Used for Static Site Generation (SSG)
 * - Filters out invalid slugs to prevent errors
 * 
 * @returns {Promise<Array>} Array of { slug } objects for static generation
 */
export async function generateStaticParams() {
  try {
    /**
     * Fetch all courses from API layer
     * - Use large pageSize to get all courses
     * - Returns { data, error } format
     */
    const { data, error } = await getCourses({ pageSize: 1000 });

    if (error || !data || !data.data) {
      console.error("Failed to generate static params for courses:", error);
      return [];
    }

    /**
     * Extract slugs from course data
     * - Strapi v5 has flat structure (no .attributes)
     * - Map directly to slug property
     * - Filter out any courses without slugs (prevents build errors)
     */
    return data.data
      .filter(course => course && course.slug)
      .map((course) => ({
        slug: course.slug,
      }));
      
  } catch (error) {
    console.error("Failed to generate static params for courses:", error);
    return [];
  }
}

// generateMetadata remains correct
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) {
    return { title: 'دوره یافت نشد' };
  }
  return {
    title: `${course.title} | وب‌سایت ما`,
    description: course.description,
  };
}

export default async function CoursePage({ params }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return (
    <main className={styles.coursePage}>
      <div className="container">
        <div className={styles.mainInfoGrid}>
          <div className={styles.mediaWrapper}>
            {/* CORRECTED: The Image component is now updated with modern props */}
            <Image
              src={course.media.url}
              alt={course.media.alt}
              fill
              priority // For LCP optimization
              sizes="(max-width: 768px) 100vw, 50vw" // For responsive image loading
              style={{ objectFit: 'cover' }} // The new way to do object-fit
            />
          </div>
          <div className={styles.details}>
            <h1 className={styles.title}>{course.title}</h1>
            <p className={styles.description}>{course.description}</p>
            <div className={styles.price}>{course.price.toman === 0 ? 'رایگان' : `${course.price.toman.toLocaleString()} تومان`}</div>
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