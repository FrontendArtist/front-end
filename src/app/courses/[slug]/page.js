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
import { isIranianPhoneNumber } from '@/lib/phoneUtils';

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

  const isForeign = Boolean(
    session?.user?.is_foreigner ||
    (session?.user?.phoneNumber && !isIranianPhoneNumber(session.user.phoneNumber))
  );

  const isFreeCourse = rawCourse.price?.toman === 0 || rawCourse.price === 0;

  // بررسی واحد و متمرکز دسترسی دوره و فصل‌ها (منبع اصلی: سفارش‌های پرداخت‌شده + فال‌بک سشن)
  const {
    hasAccess,
    purchasedChapterIds,
    activeCourseOrder
  } = await checkCourseAccess(session?.user?.id, rawCourse.id, rawCourse.slug, session?.user, rawCourse);

  const userEnrolledUuids = Array.isArray(session?.user?.enrolledChapterIntegrationIds)
    ? session.user.enrolledChapterIntegrationIds.map((u) => String(u).toLowerCase())
    : [];

  // بررسی دقیق فصل‌های خریداری‌شده کاربر (چه با شناسه چه با UUID)
  const userPurchasedChapters = (rawCourse.chapters || []).filter(ch => {
    const byUuid = ch.integrationId && userEnrolledUuids.includes(String(ch.integrationId).toLowerCase());
    const byId = purchasedChapterIds.includes(String(ch.id));
    return byUuid || byId;
  });

  const hasPurchasedAnyChapter = userPurchasedChapters.length > 0;

  // آیا تمام فصل‌های دوره به طور مجزا خریده شده‌اند؟
  const hasPurchasedAllChapters = Boolean(
    rawCourse.isChaptered &&
    Array.isArray(rawCourse.chapters) &&
    rawCourse.chapters.length > 0 &&
    rawCourse.chapters.every(ch =>
      userPurchasedChapters.some(pc => String(pc.id) === String(ch.id))
    )
  );

  const isUserEnrolledInCourse = isFreeCourse || Boolean(session && hasAccess) || hasPurchasedAllChapters;
  const isUserStudentOfCourse = isUserEnrolledInCourse || Boolean(session && hasPurchasedAnyChapter);

  // محاسبه قیمت بر اساس وضعیت کاربر (خارجی یا ایرانی)
  const hasIntlPrice = isForeign && rawCourse.internationalPrice && Number(rawCourse.internationalPrice) > 0;
  const effectivePriceToman = hasIntlPrice ? Number(rawCourse.internationalPrice) : (rawCourse.price?.toman || rawCourse.price || 0);
  const effectiveDiscountPercent = hasIntlPrice ? 0 : (rawCourse.discountPercent || 0);
  let effectiveOriginalPrice = hasIntlPrice ? Number(rawCourse.internationalPrice) : (rawCourse.originalPrice || effectivePriceToman);

  // در صورتی که دوره درصد تخفیف دارد اما قیمت اولیه مشخص نشده یا کمتر/برابر است، قیمت اولیه بدون تخفیف را تخمین می‌زنیم
  if (!hasIntlPrice && effectiveDiscountPercent > 0 && effectiveOriginalPrice <= effectivePriceToman && effectivePriceToman > 0) {
    effectiveOriginalPrice = Math.round(effectivePriceToman / (1 - effectiveDiscountPercent / 100));
  }

  // تفکیک فصل‌های خریداری‌شده و باقیمانده (خریداری‌نشده)
  const unpurchasedChapters = (rawCourse.chapters || []).filter(
    (ch) => !userPurchasedChapters.some((pc) => String(pc.id) === String(ch.id))
  );
  const unpurchasedCount = unpurchasedChapters.length;
  const isPartiallyPurchased = userPurchasedChapters.length > 0 && unpurchasedCount > 0;

  // جمع قیمت فصل‌های باقیمانده (خریداری‌نشده)
  const remainingChaptersBasePrice = unpurchasedChapters.reduce((sum, ch) => {
    const chPrice = Number(ch.price?.toman ?? ch.price ?? 0);
    return sum + (Number.isFinite(chPrice) ? chPrice : 0);
  }, 0);

  // جمع قیمت فصل‌های قبلاً خریداری‌شده
  const alreadyPaidChaptersTotal = userPurchasedChapters.reduce((sum, ch) => {
    const chPrice = Number(ch.price?.toman ?? ch.price ?? 0);
    return sum + (Number.isFinite(chPrice) ? chPrice : 0);
  }, 0);

  // محاسبه هوشمند قیمت نهایی دوره فصلی
  // ۱. اگر همه فصل‌ها خریده شده باشد: ۰
  // ۲. اگر کاربر هیچ فصلی نخریده باشد: قیمت کامل پکیج (با تخفیف کاتالوگ اگر موجود باشد)
  // ۳. اگر بخشی از فصل‌ها باقی مانده باشد (چه ۱ فصل و چه چند فصل): درصد تخفیف دوره روی مجموع قیمت فصل‌های باقیمانده اعمال می‌شود
  let netCoursePriceToman = effectivePriceToman;
  let activeDiscountPercentForRemaining = effectiveDiscountPercent;

  if (rawCourse.isChaptered && Array.isArray(rawCourse.chapters) && rawCourse.chapters.length > 0) {
    if (unpurchasedCount === 0) {
      netCoursePriceToman = 0;
      activeDiscountPercentForRemaining = 0;
    } else if (userPurchasedChapters.length === 0) {
      netCoursePriceToman = effectivePriceToman;
    } else {
      // چه ۱ فصل و چه چند فصل باقی مانده باشد: تخفیف روی جمع قیمت فصل‌های باقیمانده اعمال می‌شود
      netCoursePriceToman = effectiveDiscountPercent > 0
        ? Math.round(remainingChaptersBasePrice * (1 - effectiveDiscountPercent / 100))
        : remainingChaptersBasePrice;
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
    price: { toman: effectivePriceToman, original: effectiveOriginalPrice },
    netPriceToman: netCoursePriceToman,
    alreadyPaidChaptersTotal,
    remainingChaptersBasePrice,
    userPurchasedChaptersCount: userPurchasedChapters.length,
    unpurchasedChaptersCount: unpurchasedCount,
    originalPrice: effectiveOriginalPrice,
    internationalPrice: rawCourse.internationalPrice || null,
    isInternationalPrice: hasIntlPrice,
    discountPercent: effectiveDiscountPercent,
    activeDiscountPercentForRemaining,
    discountUntil: hasIntlPrice ? null : (rawCourse.discountUntil || null),
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
      const userEnrolledUuids = Array.isArray(session?.user?.enrolledChapterIntegrationIds)
        ? session.user.enrolledChapterIntegrationIds.map((u) => String(u).toLowerCase())
        : [];
      const hasPurchasedByUuid = Boolean(
        chapter.integrationId && userEnrolledUuids.includes(String(chapter.integrationId).toLowerCase())
      );

      const isChapterPurchased =
        isUserEnrolledInCourse ||
        hasPurchasedByUuid ||
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

  const hasDiscount = !hasIntlPrice && (course.discountPercent > 0) && (course.originalPrice > (course.price?.toman || 0));

  // محاسبه مبلغ تخفیف برای نمایش در جزئیات قیمت
  let catalogDiscountToman = 0;
  if (userPurchasedChapters.length === 0) {
    catalogDiscountToman = hasDiscount ? Math.max(0, effectiveOriginalPrice - effectivePriceToman) : 0;
  } else if (unpurchasedCount > 0 && effectiveDiscountPercent > 0) {
    catalogDiscountToman = Math.round(remainingChaptersBasePrice * (effectiveDiscountPercent / 100));
  }

  // مجموع کاهش‌ها (هزینه فصل‌های قبلی + تخفیف پکیج دوره)
  const totalReductionToman = catalogDiscountToman + (alreadyPaidChaptersTotal || 0);

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
              {isUserEnrolledInCourse ? (
                <div className={styles.enrolledBadge}>
                  ✓ شما دانشجوی این دوره هستید
                </div>
              ) : hasPurchasedAnyChapter ? (
                <div className={styles.partialBadge}>
                  ✓ دسترسی به {course.userPurchasedChaptersCount} فصل خریداری‌شده
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
                ) : null
              ) : null}
            </div >
            <p className={styles.description}>{course.description}</p>

            {/* بنر تخفیف خرید یکجا دوره - فقط برای دوره‌ای که discountPercent دارد */}
            {!isUserEnrolledInCourse && course.isChaptered && hasDiscount && course.discountPercent > 0 && (
              <div className={styles.bulkDiscountBanner}>
                🎉 با خرید یکجا دوره، از ٪{course.discountPercent} تخفیف ویژه پکیج کامل بهره‌مند شوید!
              </div>
            )}

            {/* شمارش معکوس تخفیف در صفحه دوره */}
            {!isUserEnrolledInCourse && hasDiscount && course.discountUntil && (
              <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <DiscountCountdown targetDate={course.discountUntil} compact={false} />
              </div>
            )}

            <div className={styles.buyDetail}>
              {isFreeCourse ? (
                <div className={styles.simplePriceRow}>
                  <span className={styles.price}>رایگان</span>
                </div>
              ) : isUserEnrolledInCourse ? (
                <div className={styles.simplePriceRow}>
                  <span className={styles.price}>دسترسی کامل فعال است</span>
                </div>
              ) : (
                <div className={styles.buyBlock}>
                  {/* ردیف اصلی: قیمت نهایی تمام‌شده (تخفیف + کسر فصول) و دکمه خرید */}
                  <div className={styles.standardBuyRow}>
                    <div className={styles.standardPriceCol}>
                      {course.isChaptered && (
                        <span className={styles.colLabel}>
                          {totalReductionToman > 0 ? 'قیمت تمام‌شده برای شما' : 'قیمت کل پکیج'}
                        </span>
                      )}
                      <div className={styles.discountPriceStack}>
                        <div className={styles.priceWithBadge}>
                          <span className={styles.price}>
                            {course.netPriceToman === 0
                              ? 'رایگان (تکمیل دوره)'
                              : `${course.netPriceToman.toLocaleString('fa-IR')} تومان`}
                          </span>
                          {hasDiscount && course.activeDiscountPercentForRemaining > 0 && (
                            <span className={styles.discountPill}>
                              ٪{course.activeDiscountPercentForRemaining} تخفیف
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.actionWrapper}>
                      {activeCourseOrder?.isPendingVerification ? (
                        <Link
                          href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                          className={styles.statusActionBtnPending}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>در حال بررسی فیش</span>
                        </Link>
                      ) : activeCourseOrder?.isPendingPayment ? (
                        <Link
                          href={`/profile/orders/${activeCourseOrder.documentId || activeCourseOrder.orderId}`}
                          className={styles.statusActionBtnUpload}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                          </svg>
                          <span>ارسال فیش واریزی</span>
                        </Link>
                      ) : (
                        <AddToCartButton
                          course={course}
                          buttonText={course.isChaptered ? 'خرید یکجا دوره' : 'افزودن به سبد خرید'}
                          customPrice={course.netPriceToman}
                          deductedAmount={course.alreadyPaidChaptersTotal}
                          size="small"
                        />
                      )}
                    </div>
                  </div>

                  {/* جزئیات قیمت (فقط دوره‌های فصلی که تخفیف یا کسر فصل دارند) */}
                  {course.isChaptered && totalReductionToman > 0 && (
                    <details className={styles.priceDetails}>
                      <summary className={styles.priceDetailsSummary}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span>جزئیات قیمت و تخفیف‌ها</span>
                        <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </summary>

                      <div className={styles.priceDetailsBody}>
                        {course.alreadyPaidChaptersTotal > 0 ? (
                          <div className={styles.detailRow}>
                            <span>هزینه ({course.unpurchasedChaptersCount} فصل) باقی مانده</span>
                            <span>{course.remainingChaptersBasePrice.toLocaleString('fa-IR')} تومان</span>
                          </div>
                        ) : (
                          <div className={styles.detailRow}>
                            <span>قیمت کامل پکیج</span>
                            <span>{effectiveOriginalPrice.toLocaleString('fa-IR')} تومان</span>
                          </div>
                        )}

                        {catalogDiscountToman > 0 && (
                          <div className={`${styles.detailRow} ${styles.detailDiscount}`}>
                            <span>
                              {course.alreadyPaidChaptersTotal > 0
                                ? `تخفیف خرید یکجا (٪${course.discountPercent} روی فصول باقیمانده)`
                                : `تخفیف خرید یکجا (٪${course.discountPercent})`}
                            </span>
                            <span>−{catalogDiscountToman.toLocaleString('fa-IR')} تومان</span>
                          </div>
                        )}

                        <div className={`${styles.detailRow} ${styles.detailTotal}`}>
                          <span>مبلغ قابل پرداخت</span>
                          <span>
                            {course.netPriceToman === 0
                              ? 'رایگان'
                              : `${course.netPriceToman.toLocaleString('fa-IR')} تومان`}
                          </span>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* راهنمای خرید فصلی در صورت فصلی بودن دوره */}
            {course.isChaptered && !isUserEnrolledInCourse && (
              <span className={styles.chapterNoticeSecondary}>
                💡 همچنین امکان خرید مجزای هر فصل از بخش سرفصل‌های پایین فراهم است.
              </span>
            )}

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
