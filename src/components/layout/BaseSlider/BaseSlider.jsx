'use client';

// 1. Import useState from React
import { useState } from 'react';

// Essential Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import styles from './BaseSlider.module.scss';

/**
 * A reusable slider component based on Swiper.js with built-in responsiveness.
 * @param {{
 * items: any[];
 * renderItem: (item: any) => React.ReactNode;
 * loop?: boolean;
 * slidesPerView?: number; // This will now be the default for the largest screens
 * }} props
 */
const BaseSlider = ({ items, renderItem, loop = false, slidesPerView = 4 }) => {
  // 2. Add a state to track Swiper initialization
  const [isInitialized, setIsInitialized] = useState(false);

  if (!items || items.length === 0) {
    return <div>No items to display.</div>;
  }

  // Responsive breakpoints configuration
  const breakpoints = {
    // when window width is >= 320px
    320: {
      slidesPerView: 1,
      spaceBetween: 15,
    },
    // when window width is >= 768px
    768: {
      slidesPerView: 2,
      spaceBetween: 20,
    },
    // when window width is >= 1024px
    1024: {
      slidesPerView: 3,
      spaceBetween: 30,
    },
    // when window width is >= 1280px
    1280: {
      slidesPerView: slidesPerView, // Use the prop for the largest size
      spaceBetween: 30,
    },
  };

  return (
    // 3. Apply the conditional class based on the state
    <div className={`${styles.sliderContainer} ${isInitialized ? styles.swiperInitialized : ''}`}>
      <Swiper
        modules={[Navigation]}
        navigation
        loop={loop}
        breakpoints={breakpoints} // Use the new breakpoints config
        className={styles.swiper}
        // 4. Use the onInit callback to update the state when Swiper is ready
        onInit={() => setIsInitialized(true)}
      >
        {items.map((item, index) => (
          <SwiperSlide key={index} className={styles.swiperSlide}>
            {renderItem(item)}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default BaseSlider;