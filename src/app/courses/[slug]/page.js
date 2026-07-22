import Image from 'next/image';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import CourseContentManager from '@/modules/courses/CourseContentManager';
import { getCourseBySlug } from '@/lib/coursesApi';
import { getComments } from '@/lib/commentsApi';
import CommentsSection from '@/modules/comments/CommentsSection';
import { API_BASE_URL } from '@/lib/api';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import styles from './page.module.scss';

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

  const session = await getServerSession(authOptions);

  let hasPurchasedServer = false;
  let purchasedChapterIdsServer = [];
  const isFreeCourse = rawCourse.price?.toman === 0 || rawCourse.price === 0;

  if (session?.user?.id) {
    try {
      const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
      const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

      const ordersRes = await fetch(`${STRAPI_BASE_URL}/api/orders?filters[user][id][$eq]=${session.user.id}&populate=*`, {
        headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
        cache: 'no-store'
      });

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const ordersList = ordersData.data || [];

        ordersList.forEach(order => {
          const items = order.attributes?.items || order.items || [];
          items.forEach(item => {
            // بررسی خرید کل دوره
            if (
              item.slug === rawCourse.slug ||
              String(item.courseId) === String(rawCourse.id) ||
              String(item.id) === String(rawCourse.id)
            ) {
              hasPurchasedServer = true;
            }
            // بررسی خرید فصل‌های مجزا
            if (item.type === 'chapter' || item.chapterId) {
              if (item.chapterId) purchasedChapterIdsServer.push(String(item.chapterId));
              if (item.id) {
                const cleanId = String(item.id).replace('chapter-', '');
                purchasedChapterIdsServer.push(cleanId);
              }
            }
          });
        });
      }
    } catch (e) {
      console.error("Error fetching purchases on server via orders:", e);
    }
  }

  // Fetch comments for this course
  const initialComments = await getComments('course', rawCourse.documentId);

  // Format the course data for display
  const course = {
    id: rawCourse.id,
    documentId: rawCourse.documentId,
    slug: rawCourse.slug,
    title: rawCourse.title,
    description: rawCourse.shortDescription,
    price: rawCourse.price,
    isChaptered: rawCourse.isChaptered || false,
    media: {
      url: rawCourse.image.url.startsWith('http') || rawCourse.image.url.startsWith('/images/')
        ? rawCourse.image.url
        : `${API_BASE_URL}${rawCourse.image.url}`,
      alt: rawCourse.image.alt,
    },
    chapters: (rawCourse.chapters || []).map((chapter) => {
      const isChapterPurchased =
        hasPurchasedServer ||
        purchasedChapterIdsServer.includes(String(chapter.id)) ||
        (session?.user?.enrolledChapters || []).map(String).includes(String(chapter.id));

      return {
        ...chapter,
        lessons: (chapter.lessons || []).map((lesson) => {
          // برای امنیت، اگر کاربر لاگین نیست یا مالک کل دوره/فصل نیست و درس رایگان نیست، لینک مدیا پاک می‌شود
          const shouldStrip = !session || (!isFreeCourse && !isChapterPurchased);
          if (shouldStrip && !lesson.isFree) {
            return {
              ...lesson,
              videoUrl: null,
              audioUrl: null,
            };
          }
          return lesson;
        }),
      };
    }),
    curriculum: (rawCourse.curriculum || []).map((lesson) => {
      const shouldStrip = !session || (!isFreeCourse && !hasPurchasedServer);
      if (shouldStrip && !lesson.isFree) {
        return {
          ...lesson,
          videoUrl: null,
          audioUrl: null,
        };
      }
      return lesson;
    }),
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
              {course.isChaptered
                ? 'خرید به صورت فصلی (از سرفصل‌های زیر انتخاب کنید)'
                : course.price?.toman === 0
                ? 'رایگان'
                : `${course.price?.toman.toLocaleString()} تومان`}
            </div>
            {hasPurchasedServer && (
              <div style={{ color: '#1a995b', fontWeight: 'bold', fontSize: '18px', marginTop: '10px' }}>
                ✓ شما دانشجوی این دوره هستید
              </div>
            )}
          </div>
        </div>

        {/* Course Content Manager for Player and Playlist */}
        <CourseContentManager course={course} styles={styles} />

        {/* Comments Section */}
        <CommentsSection
          entityType="course"
          entityId={course.documentId}
          initialComments={initialComments}
        />
      </div>
    </main>
  );
}