'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import clsx from 'clsx';
import VideoJSPlayer from './VideoJSPlayer';
import PlyrAudioPlayer from './PlyrAudioPlayer';
import AddToCartButton from '@/components/ui/AddToCartButton/AddToCartButton';

/**
 * مدیر محتوای دوره (Course Content Manager)
 *
 * ویژگی‌ها:
 * 1. انتخاب جلسه فعال
 * 2. کنترل دسترسی (رایگان / خریداری شده)
 * 3. تغییر حالت پخش: ویدیو یا صوت (وقتی جلسه هر دو را داشته باشد)
 * 4. پشتیبانی از آپارات (iframe embed) و فایل مستقیم (Video.js)
 */
export default function CourseContentManager({ course, styles }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const { fetchOrders } = useOrdersStore();

  const [activeLesson, setActiveLesson] = useState(null);
  // حالت پخش: پیش‌فرض روی صوت
  const [playMode, setPlayMode] = useState('audio');
  const [wasUnauthenticated, setWasUnauthenticated] = useState(false);
  const listRef = useRef(null);

  const isAuthenticated = status === 'authenticated';
  const isFreeCourse = course.price?.toman === 0 || course.price === 0;

  const isPurchased = useOrdersStore(state => {
    const allItems = state.orders.flatMap(order => {
        const items = order.attributes?.items || order.items;
        return Array.isArray(items) ? items : [];
    });
    return allItems.some(item => item.slug === course.slug || item.id === course.id || item.documentId === course.documentId);
  });

  const hasPurchased = isPurchased || isFreeCourse;

  const hasUrlsOnServer = course.curriculum?.some(l => l.videoUrl || l.audioUrl);
  const [prevPurchased, setPrevPurchased] = useState(hasPurchased || hasUrlsOnServer);

  useEffect(() => {
     if (status === 'unauthenticated') {
        setWasUnauthenticated(true);
     }
     if (status === 'authenticated') {
        fetchOrders();
        if (wasUnauthenticated) {
           // User logged in on this page, refresh to get media URLs from server
           router.refresh();
           setWasUnauthenticated(false);
        }
     }
  }, [status, wasUnauthenticated, router, fetchOrders]);

  useEffect(() => {
    // If the purchase status transitioned to true on the client, refresh server to get URLs
    if (hasPurchased && !prevPurchased) {
      router.refresh();
      setPrevPurchased(true);
    }
  }, [hasPurchased, prevPurchased, router]);

  // هندلر انتخاب جلسه - وقتی جلسه عوض می‌شود، حالت پخش را ریست می‌کنیم
  const handleLessonClick = (lesson, event) => {
    const isLocked = !isAuthenticated || (!isFreeCourse && !hasPurchased);
    if (isLocked) {
      if (!isAuthenticated) {
        openAuthModal();
      } else {
        alert('این جلسه مخصوص خریداران دوره است. لطفاً دوره را تهیه کنید.');
      }
      return;
    }

    setActiveLesson(lesson);
    // اگر صوت دارد با صوت شروع کن، وگرنه ویدیو
    setPlayMode(lesson.audioUrl ? 'audio' : 'video');
    scrollToItem(event);
  };

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
          behavior: 'smooth'
        });
      }, 50);
    }
  };

  // --- محاسبات پلیر ---

  // آیا جلسه فعلی هم ویدیو دارد هم صوت؟ (نمایش تاگل)
  const hasBoth = activeLesson?.videoUrl && activeLesson?.audioUrl;

  // URL فعلی بر اساس حالت انتخابی کاربر
  const activeUrl =
    playMode === 'audio'
      ? activeLesson?.audioUrl
      : activeLesson?.videoUrl || activeLesson?.audioUrl;

  // آیا URL فعلی از آپارات است؟
  const isAparat = activeUrl?.includes('aparat.com/v/');

  // آیا در حالت صوت هستیم (نه آپارات، نه ویدیو مستقیم)
  const isAudio = !isAparat && playMode === 'audio' && !!activeLesson?.audioUrl;

  // تبدیل لینک آپارات به Embed
  const getAparatEmbedUrl = (url) => {
    if (!url) return '';
    const videoId = url.split('/v/')[1]?.split('?')[0];
    return `https://www.aparat.com/video/video/embed/videohash/${videoId}/vt/frame`;
  };

  // تنظیمات Video.js (فقط برای ویدیو - صوت از Plyr استفاده می‌کند)
  const videoJsOptions =
    activeLesson && !isAparat && !isAudio
      ? {
          autoplay: true,
          controls: true,
          responsive: true,
          fluid: true,
          fill: false,
          poster: course.media.url,
          sources: [
            {
              src: activeUrl,
              type: 'video/mp4',
            },
          ],
        }
      : null;

  return (
    <div className={styles.contentManager}>
      {/* ---------- بخش میانی (Player) ---------- */}
      {!isAuthenticated ? (
        <div className={styles.playerSection}>
          <div className={styles.authPlaceholder}>
             <h3>برای مشاهده دوره باید در سایت عضو باشید</h3>
             <button onClick={openAuthModal} className={styles.loginBtn}>ثبت نام / ورود</button>
          </div>
        </div>
      ) : activeLesson ? (
        <div className={styles.playerSection}>
          <div className={styles.playerWrapper}>

            {/* --- تاگل ویدیو/صوت (فقط وقتی جلسه هر دو را داشته باشد) --- */}
            {hasBoth && (
              <div className={styles.mediaToggle}>
                <button
                  className={clsx(styles.toggleBtn, { [styles.toggleActive]: playMode === 'video' })}
                  onClick={() => setPlayMode('video')}
                >
                  🎥 ویدیو
                </button>
                <button
                  className={clsx(styles.toggleBtn, { [styles.toggleActive]: playMode === 'audio' })}
                  onClick={() => setPlayMode('audio')}
                >
                  🎵 صوت
                </button>
              </div>
            )}

            {/* --- پلیر: آپارات / صوت Plyr / ویدیو Video.js --- */}
            {isAparat ? (
              <div className={styles.aparatWrapper}>
                <iframe
                  key={`${activeLesson.id}-${playMode}`}
                  src={getAparatEmbedUrl(activeUrl)}
                  allowFullScreen={true}
                  webkitallowfullscreen="true"
                  mozallowfullscreen="true"
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

            {/* <h3 className={styles.sectionTitle}>
              در حال پخش: {activeLesson.title}
              {hasBoth && (
                <span className={styles.modeLabel}>
                  {playMode === 'audio' ? ' (صوتی)' : ' (ویدیویی)'}
                </span>
              )}
            </h3> */}
          </div>
        </div>
      ) : (!isFreeCourse && !hasPurchased) ? (
        <div className={styles.playerSection}>
          <div className={styles.authPlaceholder}>
             <h3>برای مشاهده این دوره باید آن را خریداری کنید</h3>
             <div style={{ marginTop: '16px' }}>
               <AddToCartButton
                 course={{
                   id: course.id || course.documentId,
                   slug: course.slug,
                   title: course.title,
                   price: course.price?.toman ?? course.price ?? 0,
                   image: course.media?.url,
                 }}
               />
             </div>
          </div>
        </div>
      ) : null}

      {/* ---------- بخش پایینی (Playlist) ---------- */}
      {course.curriculum && course.curriculum.length > 0 && (
        <div className={styles.curriculumSection}>
          <h2 className={styles.sectionTitle}>سرفصل‌های دوره</h2>
          <ul className={styles.lessonList} ref={listRef}>
            {course.curriculum.map((lesson) => {
              const isLocked = !isAuthenticated || (!isFreeCourse && !hasPurchased);
              const isActive = activeLesson?.id === lesson.id;

              return (
                <li
                  key={lesson.id}
                  className={clsx(styles.lessonItem, {
                    [styles.active]: isActive,
                    [styles.locked]: isLocked,
                  })}
                  onClick={(e) => handleLessonClick(lesson, e)}
                >
                  <div className={styles.lessonInfo}>
                    <span className={styles.lessonIcon}>
                      {isLocked ? '🔒' : lesson.videoUrl && lesson.audioUrl ? '🎬' : lesson.videoUrl ? '🎥' : '🎵'}
                    </span>
                    <span className={styles.lessonTitle}>{lesson.title}</span>
                    {lesson.isFree && <span className={styles.freeBadge}>رایگان</span>}
                    {/* بج "هر دو" برای جلساتی که ویدیو و صوت دارند */}
                    {lesson.videoUrl && lesson.audioUrl && (
                      <span className={styles.dualBadge}>ویدیو + صوت</span>
                    )}
                  </div>
                  {lesson.duration && (
                    <span className={styles.lessonDuration}>{lesson.duration}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
