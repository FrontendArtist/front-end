'use client';
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

