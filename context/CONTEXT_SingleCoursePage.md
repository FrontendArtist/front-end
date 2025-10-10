# Feature Context: Single Course Page

## 1. Goal
To create the dynamic single course page (`/courses/[slug]`). This server component will fetch course data, including curriculum, and display it using our reusable `Accordion` component. All code must be heavily commented.

## 2. File and Folder Structure
- Folder: `src/app/courses/[slug]`
- File: `src/app/courses/[slug]/page.js`
- File: `src/app/courses/[slug]/page.module.scss`

## 3. Page Logic (`page.js` with comments)
```jsx
// Import necessary components and utilities
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Accordion from '@/components/ui/Accordion/Accordion'; // Reusing our Accordion!
import styles from './page.module.scss';

// --- DATA FETCHING ---
const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

/**
 * Fetches a single course from Strapi by its slug.
 * @param {string} slug - The slug of the course to fetch.
 * @returns {Promise<object|null>} The formatted course object or null if not found.
 */
async function getCourseBySlug(slug) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/courses?populate=*&filters[slug][$eq]=${slug}`,
      { next: { revalidate: 3600 } } // Revalidate every hour
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.data || result.data.length === 0) return null;

    const rawCourse = result.data[0];
    
    // Format the data into a clean object
    return {
      id: rawCourse.id,
      title: rawCourse.attributes.title,
      description: rawCourse.attributes.description,
      price: rawCourse.attributes.price || { toman: 0 },
      // The curriculum is an array of objects, perfect for our Accordion component
      curriculum: rawCourse.attributes.curriculum.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content
      })),
      media: {
        url: STRAPI_API_URL + rawCourse.attributes.media.data.attributes.url,
        alt: rawCourse.attributes.media.data.attributes.alternativeText || '',
      }
    };
  } catch (error) {
    console.error("Failed to fetch course by slug:", error);
    return null;
  }
}

/**
 * Generates all possible course slugs at build time.
 */
export async function generateStaticParams() {
  // This part can be implemented similarly to the article/product pages
  // For now, we'll assume it's done.
  return [];
}

/**
 * Generates dynamic SEO metadata for each course page.
 */
export async function generateMetadata({ params }) {
  const course = await getCourseBySlug(params.slug);
  if (!course) {
    return { title: 'دوره یافت نشد' };
  }
  return {
    title: `${course.title} | وب‌سایت ما`,
    description: course.description,
  };
}

/**
 * The main React component for the single course page.
 */
export default async function CoursePage({ params }) {
  const { slug } = params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return (
    <main className={styles.coursePage}>
      <div className="container">
        {/* Main course info in a two-column layout */}
        <div className={styles.mainInfoGrid}>
          <div className={styles.mediaWrapper}>
            {/* Placeholder for video/image */}
            <Image src={course.media.url} alt={course.media.alt} layout="fill" objectFit="cover" />
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

        {/* Curriculum section */}
        <div className={styles.curriculumSection}>
          <h2 className={styles.sectionTitle}>سرفصل‌های دوره</h2>
          <Accordion items={course.curriculum} />
        </div>
      </div>
    </main>
  );
}

CSS (page.module.scss with comments)
SCSS

/* Main container for the course page */
.coursePage {
  padding: var(--space-section-top-desktop) 0;
}

/* Two-column grid for the main info section */
.mainInfoGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-gap-desktop);
  margin-bottom: var(--space-section-bottom-desktop);

  // On smaller screens, stack the columns
  // @include respond(md) {
  //   grid-template-columns: 1fr;
  // }
}

/* Wrapper for the course image or video */
.mediaWrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
}

/* Right column with course details */
.details {
  display: flex;
  flex-direction: column;

  .title {
    font-size: var(--font-xl);
    margin-bottom: 1rem;
  }
  .description {
    line-height: var(--line-height-lg);
    flex-grow: 1; /* Pushes price/button to the bottom */
  }
  .price {
    font-size: var(--font-lg);
    color: var(--color-text-primary);
    margin-bottom: 1.5rem;
  }
}

/* Section for the curriculum accordion */
.curriculumSection {
  max-width: 800px;
  margin: 0 auto; /* Center the accordion section */

  .sectionTitle {
    text-align: center;
    font-size: var(--font-xl);
    margin-bottom: var(--space-title-content-desktop);
  }
}