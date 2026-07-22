'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useCartStore } from '@/store/useCartStore';
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

  // اکشن افزوده به سبد خرید از Zustand useCartStore
  const addItem = useCartStore((state) => state.addItem);

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
  const isPurchasedInOrders = useMemo(() => {
    return orders.some((order) => {
      const items = order.attributes?.items || order.items || [];
      return items.some(
        (item) =>
          item.slug === course.slug ||
          String(item.id) === String(course.id) ||
          String(item.documentId) === String(course.documentId)
      );
    });
  }, [orders, course]);

  // بررسی مالکیت کلی دوره (از طریق سشن یا سفارشات یا رایگان بودن)
  const hasFullCourseAccess =
    isFreeCourse ||
    isPurchasedInOrders ||
    enrolledCourses.includes(course.id) ||
    enrolledCourses.includes(course.documentId) ||
    enrolledCourses.includes(String(course.id)) ||
    (course.slug && enrolledSlugs.includes(course.slug));

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
  const purchasedChapterIdsFromOrders = useMemo(() => {
    const chapterIds = new Set();
    orders.forEach((order) => {
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
   * 3. فصل در سشن کاربر (enrolledChapters) باشد
   * 4. فصل در سفارشات پرداخت‌شده کاربر (orders) ثبت شده باشد
   */
  const checkChapterAccess = (chapter) => {
    if (hasFullCourseAccess) return true;
    if (chapter.price?.toman === 0 || chapter.price === 0) return true;

    const chapterIdStr = String(chapter.id);

    // بررسی سشن کاربر
    const isEnrolledInSession = enrolledChapters.some(
      (id) => String(id) === chapterIdStr
    );

    // بررسی سفارشات خریده‌شده
    const isPurchasedInOrders = purchasedChapterIdsFromOrders.includes(chapterIdStr);

    return isEnrolledInSession || isPurchasedInOrders;
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
      image: course.media?.url,
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
      sources: [
        {
          src: activeUrl,
          type: 'video/mp4',
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
          بخش ویدیو / صوت پلیر (Media Player Section)
          ========================================================================= */}
      {!isAuthenticated ? (
        <div className={styles.playerSection}>
          <div className={styles.authPlaceholder}>
            <h3>برای مشاهده دوره باید در سایت عضو باشید</h3>
            <button onClick={openAuthModal} className={styles.loginBtn}>
              ثبت نام / ورود
            </button>
          </div>
        </div>
      ) : activeLesson ? (
        <div className={styles.playerSection}>
          <div className={styles.playerWrapper}>
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
              />
            ) : (
              <VideoJSPlayer
                key={`${activeLesson.id}-video`}
                options={videoJsOptions}
                courseId={course.documentId || course.id}
                lessonId={`${activeLesson.id}-video`}
                isAudio={false}
              />
            )}
          </div>
        </div>
      ) : !isChaptered && !hasFullCourseAccess ? (
        <div className={styles.playerSection}>
          <div className={styles.authPlaceholder}>
            <h3>برای مشاهده دروس این دوره باید آن را خریداری کنید</h3>
            <div style={{ marginTop: '16px' }}>
              <AddToCartButton
                course={{
                  id: course.id || course.documentId,
                  slug: course.slug,
                  title: course.title,
                  price: course.price?.toman ?? course.price ?? 0,
                  image: course.media?.url,
                  type: 'course',
                }}
              />
            </div>
          </div>
        </div>
      ) : isChaptered && !activeLesson ? (
        <div className={styles.playerSection}>
          <div className={styles.authPlaceholder}>
            <h3>برای مشاهده یا پخش، لطفاً یک جلسه را از سرفصل‌های زیر انتخاب کنید</h3>
          </div>
        </div>
      ) : null}

      {/* =========================================================================
          گام ۲ & ۳: انشعاب رندرینگ سرفصل‌ها (Render Branching: Branch A & Branch B)
          نمایش سرفصل‌ها تنها در صورت لاگین بودن کاربر (isAuthenticated === true)
          ========================================================================= */}
      {isAuthenticated && (
        <div className={styles.curriculumSection}>
          <h2 className={styles.sectionTitle}>سرفصل‌های دوره</h2>

          {/* 
            -----------------------------------------------------------------------
            شاخه B: رندر دوره‌های فصلی (Branch B: Chaptered Course - Accordion Layout)
            منطق: تفکیک دسترسی بر اساس هر فصل؛ فصل‌های باز نمایش دروس و فصل‌های قفل
            امکان افزودن به سبد خرید را فراهم می‌کنند.
            -----------------------------------------------------------------------
          */}
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
                      [styles.lockedChapter]: !isUnlocked, // استایل Dimmed (کمرنگ‌تر) برای فصل قفل شده
                    })}
                  >
                    {/* سربرگ آکوردئون فصل (Chapter Header) */}
                    <div
                      className={styles.chapterHeader}
                      onClick={(e) => handleToggleChapter(chapter, e)}
                    >
                      <div className={styles.chapterHeaderLeft}>
                        <span className={styles.chapterBadge}>فصل {index + 1}</span>
                        <div className={styles.chapterTitleGroup}>
                          <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                          {!isUnlocked && (
                            <span className={styles.lockIcon} title="فصل قفل شده است">
                              🔒
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={styles.chapterHeaderRight}>
                        {/* اطلاعات متا و قیمت فصل */}
                        <div className={styles.chapterMeta}>
                          <span>{chapterLessons.length} جلسه</span>
                          {chapter.duration && <span>• {chapter.duration}</span>}
                        </div>

                        {/* نمایش قیمت و دکمه خرید در صورت قفل بودن فصل */}
                        {!isUnlocked ? (
                          <div className={styles.chapterPriceGroup}>
                            {chapterPrice > 0 ? (
                              <button
                                className={styles.addChapterCartBtn}
                                onClick={(e) => handleAddChapterToCart(chapter, e)}
                                title="افزودن فصل به سبد خرید"
                              >
                                <span>🛒 {chapterPrice.toLocaleString()} تومان</span>
                              </button>
                            ) : (
                              <span className={styles.freeBadge}>رایگان</span>
                            )}
                          </div>
                        ) : (
                          /* آیکون چرخشی باز/بسته شدن برای فصل‌های باز */
                          <svg
                            className={clsx(styles.chevronIcon, {
                              [styles.rotated]: isOpen,
                            })}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              d="M19 9l-7 7-7-7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* محتوای باز شده فصل (Chapter Content & Lessons) */}
                    {isOpen && isUnlocked && (
                      <div className={styles.chapterContent}>
                        <ul className={styles.chapterLessonList} ref={listRef}>
                          {chapterLessons.map((lesson) => {
                            const isLessonActive = activeLesson?.id === lesson.id;

                            return (
                              <li
                                key={lesson.id}
                                className={clsx(styles.lessonItem, {
                                  [styles.active]: isLessonActive,
                                })}
                                onClick={(e) => handleLessonClick(lesson, true, e)}
                              >
                                <div className={styles.lessonInfo}>
                                  <span className={styles.lessonIcon}>
                                    {lesson.videoUrl && lesson.audioUrl
                                      ? '🎬'
                                      : lesson.videoUrl
                                      ? '🎥'
                                      : '🎵'}
                                  </span>
                                  <span className={styles.lessonTitle}>
                                    {lesson.title}
                                  </span>
                                  {lesson.isFree && (
                                    <span className={styles.freeBadge}>رایگان</span>
                                  )}
                                  {lesson.videoUrl && lesson.audioUrl && (
                                    <span className={styles.dualBadge}>
                                      ویدیو + صوت
                                    </span>
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
            /* 
              -----------------------------------------------------------------------
              شاخه A: رندر دوره‌های غیرفصلی (Branch A: Non-Chaptered Course - Flat List)
              منطق: رندر یک لیست خطی از تمام دروس با اعمال قفل روی دروس غیر رایگان
              در صورت عدم مالکیت کامل دوره.
              -----------------------------------------------------------------------
            */
            course.curriculum && (
              <ul className={styles.lessonList} ref={listRef}>
                {course.curriculum.map((lesson) => {
                  // درس قفل است اگر کاربر مالک کل دوره نباشد و درس رایگان نباشد
                  const isLessonLocked = !hasFullCourseAccess && !lesson.isFree;
                  const isLessonActive = activeLesson?.id === lesson.id;

                  return (
                    <li
                      key={lesson.id}
                      className={clsx(styles.lessonItem, {
                        [styles.active]: isLessonActive,
                        [styles.locked]: isLessonLocked, // اعمال استایل قفل و غیرفعالسازی اشاره‌گر
                      })}
                      onClick={(e) =>
                        handleLessonClick(lesson, !isLessonLocked, e)
                      }
                    >
                      <div className={styles.lessonInfo}>
                        <span className={styles.lessonIcon}>
                          {isLessonLocked
                            ? '🔒'
                            : lesson.videoUrl && lesson.audioUrl
                            ? '🎬'
                            : lesson.videoUrl
                            ? '🎥'
                            : '🎵'}
                        </span>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                        {lesson.isFree && (
                          <span className={styles.freeBadge}>رایگان</span>
                        )}
                        {lesson.videoUrl && lesson.audioUrl && (
                          <span className={styles.dualBadge}>ویدیو + صوت</span>
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
      )}

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
