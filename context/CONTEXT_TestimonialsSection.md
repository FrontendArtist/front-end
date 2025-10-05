
**۲. فایل `CONTEXT_TestimonialsSection.md`:**
```markdown
# Feature Context: Testimonials Section for Home Page

## 1. Goal
Create the testimonials section for the home page, using `BaseSlider` to display `TestimonialCard`s.

## 2. Files
- `src/modules/home/TestimonialsSection/TestimonialsSection.jsx`
- `src/modules/home/TestimonialsSection/TestimonialsSection.module.scss`

## 3. JSX (`TestimonialsSection.jsx`)
```jsx
import TestimonialCard from '@/components/cards/TestimonialCard/TestimonialCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockTestimonials } from '@/data/mock';
import styles from './TestimonialsSection.module.scss';
import Image from 'next/image';

const TestimonialsSection = () => {
  const renderTestimonialCard = (testimonial) => <TestimonialCard testimonial={testimonial} />;

  return (
    <section className={`${styles.testimonialsSection} section`}>
      <div className={`${styles.container} container`}>
        <header className={styles.header}>
          <h2 className={styles.title}>نظرات</h2>
        </header>
        <div className={styles.sliderWrapper}>
          <Image src="/images/bird-left.svg" alt="Decorative bird" width={100} height={100} className={`${styles.ornament} ${styles.birdLeft}`} />
          <BaseSlider
            items={mockTestimonials}
            renderItem={renderTestimonialCard}
            slidesPerView={1}
            loop={true}
          />
          <Image src="/images/bird-right.svg" alt="Decorative bird" width={100} height={100} className={`${styles.ornament} ${styles.birdRight}`} />
        </div>
      </div>
    </section>
  );
};
export default TestimonialsSection;
4. SCSS
Style the section, header, and slider wrapper. Use position: absolute to place the decorative bird images on the sides of the slider.

