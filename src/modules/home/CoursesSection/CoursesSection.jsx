'use client';
import Link from 'next/link';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import styles from './CoursesSection.module.scss';

/**
 * CoursesSection - بخش نمایش آخرین دوره‌ها در صفحه اصلی
 * 
 * این کامپوننت Client Component است که داده را از طریق props دریافت می‌کند.
 * داده‌ها در app/page.js (Server Component) با استفاده از getCourses() از Strapi واکشی می‌شوند.
 * 
 * معماری:
 * Server Component (page.js) → SSR Fetch → Client Component (CoursesSection) → Interactive Slider
 * 
 * @param {object} props - Props کامپوننت
 * @param {Array} props.data - آرایه دوره‌های دریافتی از Strapi
 * @returns {React.ReactElement} بخش نمایش دوره‌ها
 */
const CoursesSection = ({ data = [] }) => {
  /**
   * Function to render a single course card for the slider.
   * @param {object} course - The course data object.
   * @returns {React.ReactNode} The CourseCard component.
   */
  const renderCourseCard = (course) => {
    return <CourseCard course={course} />;
  };

  // Fallback در صورت خالی بودن داده‌ها
  if (!data || data.length === 0) {
    return (
      <section id="courses-section" className={`${styles.coursesSection} section`}>
        <div className="container">
          <header className={styles.header}>
            <h2 className={styles.title}>آخرین دوره‌ها</h2>
            <Link href="/courses" className={styles.viewAllLink}>
              مشاهده همه
            </Link>
          </header>
          <p className={styles.emptyState}>در حال حاضر دوره‌ای در دسترس نیست</p>
        </div>
      </section>
    );
  }

  return (
    <section id="courses-section" className={`${styles.coursesSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>آخرین دوره‌ها</h2>
          <Link href="/courses" className={styles.viewAllLink}>
            مشاهده همه
          </Link>
        </header>
        <div className={styles.sliderWrapper}>
          <BaseSlider
            items={data}
            renderItem={renderCourseCard}
            slidesPerView={2}
            loop={true}
          />
        </div>
      </div>
    </section>
  );
};

export default CoursesSection; 