import Image from 'next/image';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import CourseTabs from '@/modules/courses/CourseTabs/CourseTabs';
import { getCourseBySlug } from '@/lib/coursesApi';
import { getComments } from '@/lib/commentsApi';
import CommentsSection from '@/modules/comments/CommentsSection';
import { API_BASE_URL } from '@/lib/api';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { marked } from 'marked';
import AddToCartButton from '@/components/ui/AddToCartButton/AddToCartButton';
import DiscountCountdown from '@/components/ui/DiscountCountdown/DiscountCountdown';
import CourseTelegramLink from '@/components/courses/CourseTelegramLink/CourseTelegramLink';
import CourseTeaserPlayer from '@/components/courses/CourseTeaserPlayer';
import styles from './page.module.scss';
import { getUserCoursePurchases } from '@/lib/ordersApi';

import { SITE_NAME, SITE_URL } from '@/lib/constants';

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

  const courseUrl = `${SITE_URL}/courses/${slug}`;

  return {
    title: rawCourse.title,
    description: rawCourse.shortDescription,
    openGraph: {
      title: `${rawCourse.title} | ${SITE_NAME}`,
      description: rawCourse.shortDescription,
      url: courseUrl,
      images: rawCourse.image?.url ? [
        { url: rawCourse.image.url.startsWith('http') || rawCourse.image.url.startsWith('/images/') ? rawCourse.image.url : `${API_BASE_URL}${rawCourse.image.url}` }
      ] : [],
    },
    alternates: {
      canonical: courseUrl,
    }
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

  const isFreeCourse = rawCourse.price?.toman === 0 || rawCourse.price === 0;
  
  const { 
    hasPurchasedServer, 
    purchasedChapterIdsServer 
  } = await getUserCoursePurchases(session?.user?.id, rawCourse.id, rawCourse.slug);

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
    originalPrice: rawCourse.originalPrice,
    discountPercent: rawCourse.discountPercent || 0,
    discountUntil: rawCourse.discountUntil || null,
    content: rawCourse.content,
    teaserUrl: rawCourse.teaserUrl,
    isChaptered: rawCourse.isChaptered || false,
    telegramLink: rawCourse.telegramLink || rawCourse.telegram_link || rawCourse.telegramGroupLink || rawCourse.telegram || null,
    media: {
      url: rawCourse.image.url.startsWith('http') || rawCourse.image.url.startsWith('/images/')
        ? rawCourse.image.url
        : `${API_BASE_URL}${rawCourse.image.url}`,
      alt: rawCourse.image.alt,
    },
    chapters: (rawCourse.chapters || []).map((chapter) => {
      const isChapterFree = chapter.price?.toman === 0 || chapter.price === 0 || !chapter.price;
      const isChapterPurchased =
        hasPurchasedServer ||
        purchasedChapterIdsServer.includes(String(chapter.id)) ||
        (session?.user?.enrolledChapters || []).map(String).includes(String(chapter.id));

      const hasChapterAccess = isFreeCourse || isChapterFree || (session && isChapterPurchased);

      return {
        ...chapter,
        lessons: (chapter.lessons || []).map((lesson) => {
          // برای امنیت، اگر کاربر به دوره/فصل دسترسی ندارد و درس رایگان نیست، لینک مدیا پاک می‌شود
          const shouldStrip = !hasChapterAccess;
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
      const hasCurriculumAccess = isFreeCourse || (session && hasPurchasedServer);
      const shouldStrip = !hasCurriculumAccess;
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

  const hasDiscount = (course.discountPercent > 0) && (course.originalPrice > (course.price?.toman || 0));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description,
    "provider": {
      "@type": "Organization",
      "name": SITE_NAME,
      "sameAs": SITE_URL
    }
  };

  return (
    <main className={styles.coursePage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container">
        <Breadcrumb items={[
          { label: 'خانه', href: '/' },
          { label: 'دوره‌ها', href: '/courses' },
          { label: course.title }
        ]} />

        <div className={styles.mainInfoGrid}>
          <div className={styles.mediaWrapper}>
            {course.teaserUrl ? (
              <>
                <div className={styles.teaserBadge}>🏆 تیزر معرفی دوره</div>
                <CourseTeaserPlayer
                  src={course.teaserUrl}
                  poster={course.media.url}
                />
              </>
            ) : (
              <Image
                src={course.media.url}
                alt={course.media.alt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
            )}
          </div>
          <div className={styles.details}>
            <div className={styles.titleWrapper}>
              <h1 className={styles.title}>{course.title}</h1>
              {hasPurchasedServer && (
                <div className={styles.enrolledBadge}>
                  ✓ شما دانشجوی این دوره هستید
                </div>
              )}
            </div >
            <p className={styles.description}>{course.description}</p>

            {/* شمارش معکوس تخفیف در صفحه دوره */}
            {!hasPurchasedServer && hasDiscount && course.discountUntil && (
              <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <DiscountCountdown targetDate={course.discountUntil} compact={false} />
              </div>
            )}

            <div className={styles.buyDetail}>
              {!course.isChaptered && !isFreeCourse && !hasPurchasedServer && (
                <div className={styles.actionWrapper}>
                  <AddToCartButton course={course} />
                </div>
              )}
              {course.isChaptered ? (
                <span className={styles.chapteredNotice}>
                  خرید به صورت فصلی (از سرفصل‌های زیر انتخاب کنید)
                </span>
              ) : isFreeCourse ? (
                'رایگان'
              ) : hasDiscount ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <del style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                    {course.originalPrice?.toLocaleString('fa-IR')} تومان
                  </del>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={styles.price}>{`${course.price?.toman?.toLocaleString('fa-IR')}`} تومان</span>
                    <span style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      ٪{course.discountPercent} تخفیف
                    </span>
                  </div>
                </div>
              ) : (
                <span className={styles.price}>{`${course.price?.toman?.toLocaleString('fa-IR')}`} تومان</span>
              )}

            </div>

            {/* لینک گروه تلگرام دوره (نمایش فقط برای خریداران با وضعیت پرداخت شده) */}
            <CourseTelegramLink
              telegramLink={course.telegramLink}
              courseId={course.id}
              courseSlug={course.slug}
              documentId={course.documentId}
              initialHasPurchased={hasPurchasedServer}
            />
          </div>
        </div>

        {/* Course Tabs (توضیحات و سرفصل‌ها) */}
        <CourseTabs
          course={course}
          parsedContent={course.content ? marked.parse(course.content) : null}
        />

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