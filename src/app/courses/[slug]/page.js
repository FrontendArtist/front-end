import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Accordion from '@/components/ui/Accordion/Accordion';
import styles from './page.module.scss';

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

// The data fetching function remains the same as our last correct version.
async function getCourseBySlug(slug) {
  try {
    const apiUrl = `${STRAPI_API_URL}/api/courses?populate=media&filters[slug][$eq]=${slug}`;
    const response = await fetch(apiUrl, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.data || result.data.length === 0) return null;
    const rawCourse = result.data[0];
    
    let courseMedia = { url: 'https://picsum.photos/seed/placeholder/800/450', alt: 'Placeholder', width: 800, height: 450 };
    if (rawCourse.media && rawCourse.media.length > 0) {
      const firstMedia = rawCourse.media[0];
      courseMedia = {
        url: STRAPI_API_URL + firstMedia.url,
        alt: firstMedia.alternativeText || '',
        width: firstMedia.width,
        height: firstMedia.height,
      };
    }
    
    const descriptionText = (rawCourse.description && rawCourse.description[0]?.children[0]?.text) || '';

    return {
      id: rawCourse.id,
      title: rawCourse.title,
      description: descriptionText,
      price: { toman: rawCourse.price || 0 },
      curriculum: (rawCourse.curriculum || []).map(item => ({ id: item.id, title: item.title, content: item.content })),
      media: courseMedia,
    };
  } catch (error) {
    console.error("Failed to fetch course by slug:", error);
    return null;
  }
}

/**
 * CORRECTED: This function now filters out any invalid slugs
 * to prevent the server error.
 */
export async function generateStaticParams() {
  try {
    const response = await fetch(`${STRAPI_API_URL}/api/courses`);
    const result = await response.json();
    if (!result.data) return [];

    return result.data
      .filter(course => course && course.slug) // Filter out null/undefined slugs
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