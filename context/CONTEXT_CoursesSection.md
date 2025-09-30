# Feature Context: Courses Section for Home Page

## 1. REQUIRED DESIGN SYSTEM SNIPPETS (FOR AI USE)

### CSS Variables from `_variables.scss`:
```scss
:root {
  --color-text-primary: #F6D982;
  --color-title-hover: #F5C452;
}
2. Overall Goal
To create a section for the home page that showcases featured courses in a slider, using the BaseSlider and CourseCard components.

3. Component Files
src/modules/home/CoursesSection/CoursesSection.jsx

src/modules/home/CoursesSection/CoursesSection.module.scss

4. JSX Structure (CoursesSection.jsx)
This component will be very similar to the ProductsSection. According to the spec, it should show 2 slides per view.

JavaScript

import Link from 'next/link';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockCourses } from '@/data/mock';
import styles from './CoursesSection.module.scss';

const CoursesSection = () => {
  const courses = mockCourses;

  const renderCourseCard = (course) => {
    return <CourseCard course={course} />;
  };

  return (
    <section className={`${styles.coursesSection} section`}>
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
            slidesPerView={2} // Spec requires 2 slides per view for courses
            loop={true}
          />
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
5. SCSS Styling (CoursesSection.module.scss)
Create SCSS styles that are identical in structure to ProductsSection.module.scss to maintain visual consistency.

The main container should use the global .section class.

The header (.header) should use Flexbox to place the title and link on opposite ends.

Add some top margin to the slider wrapper (.sliderWrapper).

