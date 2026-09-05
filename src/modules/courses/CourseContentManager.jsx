'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useCartStore } from '@/store/useCartStore';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import Modal from '@/components/ui/Modal/Modal';
import VideoJSPlayer from './VideoJSPlayer';
import PlyrAudioPlayer from './PlyrAudioPlayer';
import AddToCartButton from '@/components/ui/AddToCartButton/AddToCartButton';
import moduleStyles from './CourseContentManager.module.scss';

/**
 * مدیر معماری سرفصل‌های دوگانه دوره (Dual-Mode Course Content Manager)
 * 
 * این کامپوننت سرفصل‌های دوره را در دو حالت مدیریت می‌کند:
 * 1. حالت غیرفصلی (Non-Chaptered / Flat List): خرید یکجای دوره
 * 2. حالت فصلی (Chaptered / Accordion): امکان خرید مجزای هر فصل یا خرید کامل دوره
 * 
 * همراه با کنترل دسترسی سطحی (Access Control Logic) برای دوره و فصل‌ها.
 */
export default function CourseContentManager({ course, styles: propStyles }) {
  // ادغام استایل‌های کلس SCSS module محلی با استایل‌های احتمالی پاس داده شده از صفحه
  const styles = { ...moduleStyles, ...propStyles };

  // =========================================================================
  // گام ۱: مدیریت احراز هویت و استیت‌ها (State & Auth Setup)
  // =========================================================================

  // استخراج داده‌های سشن کاربر از NextAuth
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // استخراج دوره‌ها و فصل‌های خریداری‌شده کاربر از داخل سشن
  const enrolledCourses = session?.user?.enrolledCourses || [];
  const enrolledSlugs = session?.user?.enrolledSlugs || [];
  const enrolledChapters = session?.user?.enrolledChapters || [];

  const router = useRouter();
  const openAuthModal = useAuthStore((state) => state.openAuthModal);

  // دریافت سفارشات و تابع فچ از Zustand
  const orders = useOrdersStore((state) => state.orders);
  const fetchOrders = useOrdersStore((state) => state.fetchOrders);

  // اکشن افزوده به سبد خرید و لیست آیتم‌ها از Zustand useCartStore
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  const isChapterInCart = (chapterId) => {
    return cartItems.some(
      (item) =>
        item.id === `chapter-${chapterId}` ||
        String(item.chapterId) === String(chapterId)
    );
  };

  // استیت‌های محلی برای پخش‌کننده ویدیو/صوت و آکوردئون
  const [activeLesson, setActiveLesson] = useState(null);
  const [playMode, setPlayMode] = useState('audio'); // 'audio' یا 'video'
  const [openChapterId, setOpenChapterId] = useState(null); // مدیریت باز بودن آکوردئون فصل‌ها
  const [addedChapterModal, setAddedChapterModal] = useState(null); // مودال تایید اضافه شدن فصل به سبد
  const [wasUnauthenticated, setWasUnauthenticated] = useState(false);
  const listRef = useRef(null);

  // بررسی رایگان بودن کل دوره
  const isFreeCourse = course.price?.toman === 0 || course.price === 0;

  // بررسی خرید از طریق سفارشات با useMemo جهت داشتن مرجع پایدار (جلوگیری از حلقه بی‌نهایت رندر)
  // ⚠️ فقط سفارش‌های پرداخت‌شده و تأییدشده دسترسی ایجاد می‌کنند (سفارش‌های کارت‌به‌کارت pending تا زمان تأیید ادمین دسترسی نمی‌دهند)
  const isPurchasedInOrders = useMemo(() => {
    return orders.some((order) => {
      if (!isOrderPaid(order)) return false;

      const items = order.attributes?.items || order.items || [];
      return items.some((item) => {
        // اگر آیتم مربوط به فصل باشد، نباید دسترسی کل دوره ایجاد کند
        const isChapterItem = Boolean(
          item.type === 'chapter' ||
          item.chapterId ||
          (item.slug && String(item.slug).includes('-chapter-')) ||
          (item.id && String(item.id).startsWith('chapter-'))
        );
        if (isChapterItem) return false;

        return (
          item.slug === course.slug ||
          String(item.courseId) === String(course.id) ||
          String(item.id) === String(course.id) ||
          String(item.documentId) === String(course.documentId)
        );
      });
    });
  }, [orders, course]);

  // بررسی مالکیت کلی دوره (از طریق سفارشات یا رایگان بودن)
  const hasFullCourseAccess = isFreeCourse || isPurchasedInOrders;

  // هماهنگی بروزرسانی داده‌ها هنگام لاگین کاربر
  useEffect(() => {
    if (status === 'unauthenticated') {
      setWasUnauthenticated(true);
    }
    if (status === 'authenticated') {
      fetchOrders();
      if (wasUnauthenticated) {
        router.refresh();
        setWasUnauthenticated(false);
      }
    }
  }, [status, wasUnauthenticated, router, fetchOrders]);

  // استخراج لیست شناسه‌های فصل‌های خریداری شده از سفارشات کاربر با useMemo جهت جلوگیری از تغییر reference
  // ⚠️ فقط سفارش‌های پرداخت‌شده و تأییدشده لحاظ می‌شوند
  const purchasedChapterIdsFromOrders = useMemo(() => {
    const chapterIds = new Set();
    orders.forEach((order) => {
      if (!isOrderPaid(order)) return;

      const items = order.attributes?.items || order.items || [];
      items.forEach((item) => {
        if (item.type === 'chapter' || item.chapterId) {
          if (item.chapterId) chapterIds.add(String(item.chapterId));
          if (item.id) {
            const rawId = String(item.id).replace('chapter-', '');
            chapterIds.add(rawId);
          }
        }
      });
    });
    return Array.from(chapterIds);
  }, [orders]);

  // =========================================================================
  // منطق کنترل دسترسی فصل‌ها (Chapter Access Logic)
  // =========================================================================

  /**
   * بررسی دسترسی کاربر به یک فصل مشخص
   * کاربر به فصل دسترسی دارد اگر:
   * 1. کل دوره را خریده باشد (hasFullCourseAccess)
   * 2. فصل رایگان باشد
   * 3. فصل در سفارشات پرداخت‌شده کاربر (orders) ثبت شده باشد
   */
  const checkChapterAccess = (chapter) => {
    if (hasFullCourseAccess) return true;
    const chapterPrice = chapter.price?.toman ?? chapter.price ?? 0;
    if (chapterPrice === 0 || chapter.isFree) return true;

    const chapterIdStr = String(chapter.id);
    return purchasedChapterIdsFromOrders.includes(chapterIdStr);
  };

  /**
   * هندلر افزودن یک فصل مشخص به سبد خرید
   */
  const handleAddChapterToCart = (chapter, event) => {
    event?.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const chapterPrice = chapter.price?.toman ?? chapter.price ?? 0;

    addItem({
      id: `chapter-${chapter.id}`,
      chapterId: chapter.id,
      courseId: course.id || course.documentId,
      slug: `${course.slug}-chapter-${chapter.id}`,
      title: `${course.title} - ${chapter.title}`,
      price: chapterPrice,
      image: course.media?.url || '/images/forempties2.png',
      type: 'chapter',
    });

    setAddedChapterModal(chapter);
  };

  /**
   * هندلر انتخاب جلسه برای پخش در پلیر
   */
  const handleLessonClick = (lesson, isUnlocked, event) => {
    if (!isUnlocked) {
      if (!isAuthenticated) {
        openAuthModal();
      } else {
        alert('این جلسه قفل است. برای دسترسی، دوره یا فصل مربوطه را تهیه کنید.');
      }
      return;
    }

    setActiveLesson(lesson);
    setPlayMode(lesson.audioUrl ? 'audio' : 'video');
    scrollToItem(event);
  };

  /**
   * اسکرول نرم به آیتم انتخاب شده
   */
  const scrollToItem = (event) => {
    if (event && listRef.current) {
      const listItem = event.currentTarget;
      const listContainer = listRef.current;
      const containerTop = listContainer.getBoundingClientRect().top;
      const itemTop = listItem.getBoundingClientRect().top;
      const currentScroll = listContainer.scrollTop;
      const targetScroll = currentScroll + (itemTop - containerTop) - 10;

      setTimeout(() => {
        listContainer.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
      }, 50);
    }
  };

  /**
   * هندلر باز و بسته کردن آکوردئون فصل‌ها
   * در صورت قفل بودن فصل، کلیک روی سربرگ فصل نیز افزودن فصل به سبد خرید را هدایت می‌کند
   */
  const handleToggleChapter = (chapter, event) => {
    const isUnlocked = checkChapterAccess(chapter);
    if (isUnlocked) {
      setOpenChapterId((prev) => (prev === chapter.id ? null : chapter.id));
    } else {
      handleAddChapterToCart(chapter, event);
    }
  };

  // --- محاسبات پلیر ---
  const hasBoth = activeLesson?.videoUrl && activeLesson?.audioUrl;
  const activeUrl =
    playMode === 'audio'
      ? activeLesson?.audioUrl
      : activeLesson?.videoUrl || activeLesson?.audioUrl;
  const isAparat = activeUrl?.includes('aparat.com/v/');
  const isAudio = !isAparat && playMode === 'audio' && !!activeLesson?.audioUrl;

  const getAparatEmbedUrl = (url) => {
    if (!url) return '';
    const videoId = url.split('/v/')[1]?.split('?')[0];
    return `https://www.aparat.com/video/video/embed/videohash/${videoId}/vt/frame`;
  };

  const videoJsOptions = useMemo(() => {
    if (!activeLesson || isAparat || isAudio) return null;
    return {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      fill: false,
      poster: course.media?.url,
      controlBar: {
        skipButtons: {
          forward: 10,
          backward: 10,
        },
      },
      sources: [
        {
          src: activeUrl,
          type: activeUrl?.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
        },
      ],
    };
  }, [activeLesson, isAparat, isAudio, activeUrl, course.media?.url]);

  // تشخیص نوع دوره (فصلی یا غیرفصلی)
  const isChaptered = Boolean(
    course.isChaptered && course.chapters && course.chapters.length > 0
  );

  return (
    <div className={styles.contentManager}>
      {/* =========================================================================
          بخش ویدیو / صوت پلیر (Media Player Section) با تدابیر ضد دانلود
          ========================================================================= */}
      {activeLesson && (
        <div className={styles.playerSection} onContextMenu={(e) => e.preventDefault()}>
          <div className={styles.playerWrapper} onContextMenu={(e) => e.preventDefault()}>
            {/* تاگل انتخاب بین ویدیو و صوت */}
            {hasBoth && (
              <div className={styles.mediaToggle}>
                <button
                  className={clsx(styles.toggleBtn, {
                    [styles.toggleActive]: playMode === 'video',
                  })}
                  onClick={() => setPlayMode('video')}
                >
                  🎥 ویدیو
                </button>
                <button
                  className={clsx(styles.toggleBtn, {
                    [styles.toggleActive]: playMode === 'audio',
                  })}
                  onClick={() => setPlayMode('audio')}
                >
                  🎵 صوت
                </button>
              </div>
            )}

            {/* رندر پلیر مربوطه: آپارات / Plyr صوتی / Video.js ویدیویی */}
            {isAparat ? (
              <div className={styles.aparatWrapper}>
                <iframe
                  key={`${activeLesson.id}-${playMode}`}
                  src={getAparatEmbedUrl(activeUrl)}
                  allowFullScreen={true}
                ></iframe>
              </div>
            ) : isAudio ? (
              <PlyrAudioPlayer
                key={`${activeLesson.id}-audio`}
                src={activeUrl}
                courseId={course.documentId || course.id}
                lessonId={activeLesson.id}
                user={session?.user}
              />
            ) : (
              <VideoJSPlayer
                key={`${activeLesson.id}-video`}
                options={videoJsOptions}
                courseId={course.documentId || course.id}
                lessonId={`${activeLesson.id}-video`}
                isAudio={false}
                user={session?.user}
              />
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          گام ۲ & ۳: انشعاب رندرینگ سرفصل‌ها (Render Branching: Branch A & Branch B)
          ========================================================================= */}
      <div className={styles.curriculumSection}>
        {/* <h2 className={styles.sectionTitle}>سرفصل‌های دوره</h2> */}

        {isChaptered ? (
          <div className={styles.accordion}>
            {course.chapters.map((chapter, index) => {
              const isUnlocked = checkChapterAccess(chapter);
              const isOpen = openChapterId === chapter.id;
              const chapterLessons = chapter.lessons || chapter.curriculum || [];
              const chapterPrice = chapter.price?.toman ?? chapter.price ?? 0;

              return (
                <div
                  key={chapter.id || index}
                  className={clsx(styles.chapterItem, {
                    [styles.openChapter]: isOpen,
                  })}
                >
                  {/* سربرگ آکوردئون فصل (Chapter Header) */}
                  <div
                    className={styles.chapterHeader}
                    onClick={() => {
                      setOpenChapterId((prev) => (prev === chapter.id ? null : chapter.id));
                    }}
                  >
                    <div className={styles.chapterHeaderRight}>
                      <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                    </div>

                    <div className={styles.chapterHeaderLeft}>
                      <div className={styles.chapterMeta}>
                        <span>{chapterLessons.length} جلسه</span>
                      </div>

                      {/* نمایش قیمت و دکمه خرید فصل مستقیماً روی هدر فصل */}
                      {!isUnlocked && chapterPrice > 0 ? (
                        <div className={styles.chapterBuyAction}>
                          <span className={styles.chapterPrice}>
                            {chapterPrice.toLocaleString('fa-IR')} تومان
                          </span>
                          {isChapterInCart(chapter.id) ? (
                            <button
                              type="button"
                              className={clsx(styles.headerBuyChapterBtn, styles.inCartBtn)}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push('/cart');
                              }}
                              title="مشاهده در سبد خرید"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span>در سبد خرید</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.headerBuyChapterBtn}
                              onClick={(e) => handleAddChapterToCart(chapter, e)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                              </svg>
                              <span>خرید فصل</span>
                            </button>
                          )}
                        </div>
                      ) : isUnlocked ? (
                        <span className={styles.unlockedBadge}>
                          ✓ دسترسی فعال
                        </span>
                      ) : (
                        <span className={styles.freeBadge}>
                          رایگان
                        </span>
                      )}

                      <div className={styles.chapterStatus}>
                        <svg
                          className={clsx(styles.chevronIcon, {
                            [styles.rotated]: isOpen,
                          })}
                          width="18" height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* محتوای باز شده فصل (Chapter Content & Lessons) */}
                  {isOpen && (
                    <div className={styles.chapterContent}>
                      <ul
                        className={clsx(styles.chapterLessonList, {
                          [styles.disabledList]: !isUnlocked,
                        })}
                        ref={listRef}
                      >
                        {chapterLessons.map((lesson) => {
                          const isLessonActive = activeLesson?.id === lesson.id;
                          const isLessonLocked = !isUnlocked && !lesson.isFree;

                          return (
                            <li
                              key={lesson.id}
                              className={clsx(styles.lessonItem, {
                                [styles.active]: isLessonActive,
                                [styles.lockedLesson]: isLessonLocked,
                              })}
                              onClick={(e) => handleLessonClick(lesson, !isLessonLocked, e)}
                            >
                              <div className={styles.lessonInfo}>
                                <span className={styles.lessonIcon}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                                </span>
                                <span className={styles.lessonTitle}>
                                  {lesson.title}
                                </span>
                                {lesson.isFree && (
                                  <span className={styles.freeBadge}>رایگان</span>
                                )}
                              </div>
                              {lesson.duration && (
                                <span className={styles.lessonDuration}>
                                  {lesson.duration}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          course.curriculum && (
            <ul className={styles.lessonList} ref={listRef}>
              {course.curriculum.map((lesson) => {
                const isLessonLocked = !hasFullCourseAccess && !lesson.isFree;
                const isLessonActive = activeLesson?.id === lesson.id;

                return (
                  <li
                    key={lesson.id}
                    className={clsx(styles.lessonItem, {
                      [styles.active]: isLessonActive,
                      [styles.lockedLesson]: isLessonLocked,
                    })}
                    onClick={(e) => handleLessonClick(lesson, !isLessonLocked, e)}
                  >
                    <div className={styles.lessonInfo}>
                      <span className={styles.lessonIcon}>
                        {isLessonLocked ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                        )}
                      </span>
                      <span className={styles.lessonTitle}>{lesson.title}</span>
                      {lesson.isFree && (
                        <span className={styles.freeBadge}>رایگان</span>
                      )}
                    </div>
                    {lesson.duration && (
                      <span className={styles.lessonDuration}>
                        {lesson.duration}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        )}
      </div>

      {/* =========================================================================
          مودال سراسری تایید افزودن فصل به سبد خرید (Cart Confirmation Modal)
          ========================================================================= */}
      <Modal
        isOpen={Boolean(addedChapterModal)}
        onClose={() => setAddedChapterModal(null)}
        title="افزوده شد به سبد خرید"
      >
        <div className={styles.modalBody}>
          <p>
            فصل <strong>«{addedChapterModal?.title}»</strong> با موفقیت به سبد خرید شما اضافه شد.
          </p>
          <div className={styles.modalActions}>
            <Link href="/cart" className={styles.goToCartBtn}>
              مشاهده سبد خرید و پرداخت
            </Link>
            <button
              className={styles.continueBtn}
              onClick={() => setAddedChapterModal(null)}
            >
              ادامه مشاهده دوره
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
