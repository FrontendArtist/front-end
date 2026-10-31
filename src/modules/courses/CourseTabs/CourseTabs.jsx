'use client';

import React, { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useSession } from 'next-auth/react';
import { useAccountOrderItems } from '@/hooks/useAccountOrders';
import { isCoursePurchasedByUser } from '@/lib/courseAccessUtils';
import CourseContentManager from '../CourseContentManager';
import ArticleReader from '@/app/articles/[slug]/ArticleReader';
import styles from './CourseTabs.module.scss';

/**
 * CourseTabs Component
 * 
 * Manages tabs for Course Details:
 * 1. "توضیحات" (Description / Content Section)
 * 2. "سرفصل‌ها" (Curriculum / Chapters & Lessons Manager)
 * 
 * اگر کاربر دوره را خریده باشد، تب سرفصل‌ها اول و به عنوان تب پیش‌فرض فعال خواهد بود.
 */
export default function CourseTabs({ course, parsedContent, customStyles, isPurchased: propIsPurchased }) {
  const { data: session, status } = useSession();
  const orders = useAccountOrderItems();

  // بررسی وضعیت خرید دوره یا حداقل یکی از فصل‌ها
  const isPurchased = useMemo(() => {
    if (propIsPurchased === true) return true;
    if (course?.isPurchased === true || course?.isEnrolled === true || course?.hasAccess === true) return true;
    if (!course) return false;

    // فلگ false فقط یعنی «کل دوره خریده نشده»؛ خرید فصل باید مستقل بررسی شود.
    return isCoursePurchasedByUser(
      { ...course, isPurchased: undefined, hasAccess: undefined },
      { session, orders, checkChapters: true }
    );
  }, [propIsPurchased, course, session, orders]);

  const hasContent = Boolean(parsedContent);
  const defaultTab = (isPurchased || !hasContent) ? 'curriculum' : 'description';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);

  // هماهنگی تب فعال با وضعیت خرید یا سابقه گوش دادن دوره توسط کاربر
  useEffect(() => {
    if (!hasUserSelectedTab) {
      try {
        const cId = course?.id ? String(course.id) : null;
        const docId = course?.documentId ? String(course.documentId) : null;
        const slug = course?.slug ? String(course.slug) : null;

        const hasHistory =
          (cId && localStorage.getItem(`last_listened_lesson_c${cId}`)) ||
          (docId && localStorage.getItem(`last_listened_lesson_c${docId}`)) ||
          (slug && localStorage.getItem(`last_listened_lesson_slug_${slug}`));

        if (hasHistory) {
          setActiveTab('curriculum');
          return;
        }
      } catch (e) {}

      setActiveTab(defaultTab);
    }
  }, [defaultTab, hasUserSelectedTab, course]);

  // محاسبه تعداد کل جلسات
  const totalLessons = course?.isChaptered
    ? (course.chapters || []).reduce(
        (acc, ch) => acc + (ch.lessons?.length || ch.curriculum?.length || 0),
        0
      )
    : (course?.curriculum || []).length;

  // دکمه تب سرفصل‌ها
  const curriculumTabButton = (
    <button
      key="curriculum"
      type="button"
      role="tab"
      aria-selected={activeTab === 'curriculum'}
      className={clsx(styles.tabBtn, {
        [styles.activeTab]: activeTab === 'curriculum',
      })}
      onClick={() => {
        setActiveTab('curriculum');
        setHasUserSelectedTab(true);
      }}
    >
      <span className={styles.tabIcon}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      </span>
      <span className={styles.tabTitle}>سرفصل‌های دوره</span>
      {totalLessons > 0 && (
        <span className={styles.tabBadge}>
          {totalLessons} جلسه
        </span>
      )}
    </button>
  );

  // دکمه تب توضیحات دوره
  const descriptionTabButton = hasContent ? (
    <button
      key="description"
      type="button"
      role="tab"
      aria-selected={activeTab === 'description'}
      className={clsx(styles.tabBtn, {
        [styles.activeTab]: activeTab === 'description',
      })}
      onClick={() => {
        setActiveTab('description');
        setHasUserSelectedTab(true);
      }}
    >
      <span className={styles.tabIcon}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </span>
      <span className={styles.tabTitle}>توضیحات دوره</span>
    </button>
  ) : null;

  return (
    <section id="course-tabs-wrapper" className={styles.tabsWrapper} aria-label="بخش‌های دوره">
      {/* نوار جابجایی بین تب‌ها: در صورت خریداری دوره، تب سرفصل‌ها اول قرار می‌گیرد */}
      <div className={styles.tabsNav} role="tablist">
        {isPurchased ? (
          <>
            {curriculumTabButton}
            {descriptionTabButton}
          </>
        ) : (
          <>
            {descriptionTabButton}
            {curriculumTabButton}
          </>
        )}
      </div>

      {/* پنل‌های محتوا */}
      <div className={styles.tabPanels}>
        {/* تب توضیحات تکمیلی */}
        {hasContent && (
          <div
            role="tabpanel"
            className={clsx(styles.tabPanel, {
              [styles.hiddenPanel]: activeTab !== 'description',
            })}
          >
            <div className={styles.contentSection}>
              <ArticleReader content={parsedContent} />
            </div>
          </div>
        )}

        {/* تب سرفصل‌ها و پلیر */}
        <div
          role="tabpanel"
          className={clsx(styles.tabPanel, {
            [styles.hiddenPanel]: activeTab !== 'curriculum',
          })}
        >
          <CourseContentManager course={course} styles={customStyles} />
        </div>
      </div>
    </section>
  );
}
