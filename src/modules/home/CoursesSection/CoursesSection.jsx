'use client';
import Link from 'next/link';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockCourses } from '@/data/mock';
import styles from './CoursesSection.module.scss';

const CoursesSection = () => {
  // We use mock data for now. This will be replaced by an API call later.
  const courses = mockCourses;

  /**
   * Function to render a single course card for the slider.
   * @param {object} course - The course data object.
   * @returns {React.ReactNode} The CourseCard component.
   */
  const renderCourseCard = (course) => {
    return <CourseCard course={course} />;
  };

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
            items={courses}
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