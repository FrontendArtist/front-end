import Image from 'next/image';
import Link from 'next/link';
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
import { checkCourseAccess } from '@/lib/ordersApi';

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
  
  // بررسی واحد و متمرکز دسترسی دوره و فصل‌ها (منبع اصلی: سفارش‌های پرداخت‌شده + فال‌بک سشن)
  const { 
    hasAccess, 
    purchasedChapterIds,
    activeCourseOrder
  } = await checkCourseAccess(session?.user?.id, rawCourse.id, rawCourse.slug, session?.user);

  const isUserEnrolledInCourse = isFreeCourse || Boolean(session && hasAccess);
  const hasPurchasedAnyChapter = (rawCourse.chapters || []).some(ch =>
    purchasedChapterIds.includes(String(ch.id))
  );
  const isUserStudentOfCourse = isUserEnrolledInCourse || Boolean(session && hasPurchasedAnyChapter);

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
        isUserEnrolledInCourse ||
        purchasedChapterIds.includes(String(chapter.id));

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
      const hasCurriculumAccess = isUserEnrolledInCourse;
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
              {isUserStudentOfCourse ? (
                <div className={styles.enrolledBadge}>
                  ✓ شما دانشجوی این دوره هستید
                </div>
              ) : activeCourseOrder ? (
                activeCourseOrder.isPendingVerification ? (
                  <Link
                    href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                    className={styles.statusBadgeVerification}
                    title="مشاهده وضعیت سفارش"
                  >
                    ⏳ در انتظار بررسی فیش واریزی
                  </Link>
                ) : activeCourseOrder.isPendingPayment ? (
                  <Link
                    href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                    className={styles.statusBadgePendingPayment}
                    title="برای ارسال فیش کلیک کنید"
                  >
                    💳 در انتظار ارسال فیش واریزی
                  </Link>
                ) : activeCourseOrder.isRejected ? (
                  <Link
                    href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                    className={styles.statusBadgeRejected}
                    title="برای مشاهده علت و ارسال مجدد فیش کلیک کنید"
                  >
                    ✕ پرداخت رد شد (ارسال مجدد فیش)
                  </Link>
                ) : null
              ) : null}
            </div >
            <p className={styles.description}>{course.description}</p>

            {/* اعلان رد پرداخت به همراه دلیل و دکمه اقدام */}
            {!isUserStudentOfCourse && activeCourseOrder?.isRejected && (
              <div className={styles.rejectionNoticeBox}>
                <div className={styles.rejectionNoticeHeader}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <strong>پرداخت سفارش شما برای این دوره تأیید نشد</strong>
                </div>
                {activeCourseOrder.rejectionReason && (
                  <p className={styles.rejectionReasonText}>
                    <strong>علت عدم تأیید:</strong> {activeCourseOrder.rejectionReason}
                  </p>
                )}
                <Link
                  href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                  className={styles.rejectionActionLink}
                >
                  برای ارسال مجدد فیش واریزی کلیک کنید ←
                </Link>
              </div>
            )}

            {/* شمارش معکوس تخفیف در صفحه دوره */}
            {!isUserEnrolledInCourse && hasDiscount && course.discountUntil && (
              <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <DiscountCountdown targetDate={course.discountUntil} compact={false} />
              </div>
            )}

            <div className={styles.buyDetail}>
              {!course.isChaptered && !isFreeCourse && !isUserStudentOfCourse && (
                <div className={styles.actionWrapper}>
                  {activeCourseOrder?.isRejected ? (
                    <Link
                      href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                      className={styles.statusActionBtnRejected}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      <span>پرداخت رد شد — ارسال مجدد فیش</span>
                    </Link>
                  ) : activeCourseOrder?.isPendingVerification ? (
                    <Link
                      href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                      className={styles.statusActionBtnPending}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>در حال بررسی فیش واریزی</span>
                    </Link>
                  ) : activeCourseOrder?.isPendingPayment ? (
                    <Link
                      href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                      className={styles.statusActionBtnUpload}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      <span>در انتظار ارسال فیش واریزی</span>
                    </Link>
                  ) : (
                    <AddToCartButton course={course} />
                  )}
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
              initialHasPurchased={isUserEnrolledInCourse}
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