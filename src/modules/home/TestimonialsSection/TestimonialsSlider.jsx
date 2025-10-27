'use client';
import TestimonialCard from '@/components/cards/TestimonialCard/TestimonialCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import Image from 'next/image';
import styles from './TestimonialsSection.module.scss';

const TestimonialsSlider = ({ testimonials }) => {
  const renderTestimonialCard = (testimonial) => <TestimonialCard testimonial={testimonial} />;

  return (
    <div className={styles.sliderWrapper}>

      <BaseSlider
        items={testimonials}
        renderItem={renderTestimonialCard}
        slidesPerView={1}
        loop={true}
      />

    </div>
  );
};

export default TestimonialsSlider;

