'use client';

import { useState, useRef } from 'react';

import 'swiper/css';
import 'swiper/css/navigation';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import styles from './BaseSlider.module.scss';

const BaseSlider = ({ items, renderItem, loop = false, slidesPerView = 4, breakpoints }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  // refs for custom navigation buttons
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  if (!items || items.length === 0) {
    return <div>No items to display.</div>;
  }

  const defaultBreakpoints = {
    0: { slidesPerView: 1, spaceBetween: 15 },
    576: { slidesPerView: 2, spaceBetween: 15 },
    768: { slidesPerView: 3, spaceBetween: 20 },
    1024: { slidesPerView: 4, spaceBetween: 30 },
    1280: { slidesPerView, spaceBetween: 30 },
  };

  const swiperBreakpoints = breakpoints || defaultBreakpoints;

  return (
    <div className={styles.sliderWrapper}>
      {/* 🔹 custom buttons (outside swiper) */}
      <button
        ref={nextRef}
        className={`${styles.navBtn} ${styles.prev}`}
        aria-label="Next Slide"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      </button>

      <button
        ref={prevRef}
        className={`${styles.navBtn} ${styles.next}`}
        aria-label="Previous Slide"
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
          watchOverflow={false}
          breakpoints={swiperBreakpoints}
          className={styles.swiper}
          onBeforeInit={(swiper) => {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          onInit={() => {
            setIsInitialized(true);
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
