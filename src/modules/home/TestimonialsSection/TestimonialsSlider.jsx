'use client';
import TestimonialCard from '@/components/cards/TestimonialCard/TestimonialCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import Image from 'next/image';
import styles from './TestimonialsSection.module.scss';

const TestimonialsSlider = ({ testimonials }) => {
  const renderTestimonialCard = (testimonial) => <TestimonialCard testimonial={testimonial} />;

  const testimonialBreakpoints = {
    320: { slidesPerView: 1, spaceBetween: 15 },
    768: { slidesPerView: 1, spaceBetween: 20 },
    1024: { slidesPerView: 1, spaceBetween: 30 },
    1280: { slidesPerView: 1, spaceBetween: 30 },
  };

  return (
    <div className={styles.sliderWrapper}>

      <BaseSlider
        items={testimonials}
        renderItem={renderTestimonialCard}
        slidesPerView={1}
        loop={true}
        breakpoints={testimonialBreakpoints}
      />

    </div>
  );
};

export default TestimonialsSlider;

