# Feature Context: BaseSlider Component

## 1. Overall Goal
To create a generic, reusable slider component named `BaseSlider` that acts as a wrapper around the Swiper.js library. This component will be used for all carousels on the website (e.g., products, articles). It must be a client component because it handles user interaction.

## 2. Component Files
Create the following files:
- `src/components/layout/BaseSlider/BaseSlider.jsx`
- `src/components/layout/BaseSlider/BaseSlider.module.scss`

## 3. JSX Structure (`BaseSlider.jsx`)
The component needs to be a client component (`'use client'`). It will accept a list of items and a `renderItem` function as props to remain generic.

```jsx
'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import styles from './BaseSlider.module.scss';

/**
 * A reusable slider component based on Swiper.js.
 * @param {{
 * items: any[];
 * renderItem: (item: any) => React.ReactNode;
 * slidesPerView?: number;
 * loop?: boolean;
 * }} props
 */
const BaseSlider = ({ items, renderItem, slidesPerView = 4, loop = false }) => {
  if (!items || items.length === 0) {
    return <div>No items to display.</div>;
  }

  return (
    <div className={styles.sliderContainer}>
      <Swiper
        modules={[Navigation]}
        navigation
        spaceBetween={30}
        slidesPerView={slidesPerView}
        loop={loop}
        className={styles.swiper}
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

4. SCSS Styling (BaseSlider.module.scss)
The styling should primarily focus on customizing the Swiper navigation arrows to match our site's design.

Override the default Swiper navigation arrow styles (.swiper-button-prev, .swiper-button-next).

The custom arrows should be styled using our global CSS variables (e.g., var(--color-text-primary) for the arrow color).

Ensure the slider container has overflow: hidden to prevent layout issues.