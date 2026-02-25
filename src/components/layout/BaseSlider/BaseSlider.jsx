'use client';

import { useState, useRef } from 'react';

import 'swiper/css';
import 'swiper/css/navigation';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import styles from './BaseSlider.module.scss';

const BaseSlider = ({ items, renderItem, loop = false, slidesPerView = 4 }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);

  // refs for custom navigation buttons
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  if (!items || items.length === 0) {
    return <div>No items to display.</div>;
  }

  const breakpoints = {
    320: { slidesPerView: 2, spaceBetween: 15 },
    768: { slidesPerView: 3, spaceBetween: 20 },
    1024: { slidesPerView: 4, spaceBetween: 30 },
    1280: { slidesPerView, spaceBetween: 30 },
  };

  return (
    <div className={styles.sliderWrapper}>
      {/* 🔹 custom buttons (outside swiper) - hidden via CSS when not needed */}
      <button
        ref={nextRef}
        className={`${styles.navBtn} ${styles.prev} ${!showNavigation ? styles.hidden : ''}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      </button>

      <button
        ref={prevRef}
        className={`${styles.navBtn} ${styles.next} ${!showNavigation ? styles.hidden : ''}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      </button>

      <div
        className={`${styles.sliderContainer} ${isInitialized ? styles.swiperInitialized : ''
          }`}
      >
        <Swiper
          modules={[Navigation]}
          loop={loop}
          breakpoints={breakpoints}
          className={styles.swiper}
          onBeforeInit={(swiper) => {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          onInit={(swiper) => {
            setIsInitialized(true);
            // Check if navigation is needed (slides > slidesPerView)
            const needsNavigation = swiper.slides.length > swiper.params.slidesPerView;
            setShowNavigation(needsNavigation);
          }}
          onResize={(swiper) => {
            // Update navigation visibility on window resize
            const needsNavigation = swiper.slides.length > swiper.params.slidesPerView;
            setShowNavigation(needsNavigation);
          }}
        >
          {items.map((item, index) => (
            <SwiperSlide key={index} className={styles.swiperSlide}>
              {renderItem(item)}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default BaseSlider;
