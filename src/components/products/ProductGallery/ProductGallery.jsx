'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './ProductGallery.module.scss';

/**
 * An interactive image gallery for products.
 * @param {{
 * images: Array<{url: string, alt: string}>;
 * }} props
 */
const ProductGallery = ({ images }) => {
  // If there are no images, render nothing or a placeholder.
  if (!images || images.length === 0) {
    return <div className={styles.placeholder}>تصویری وجود ندارد</div>;
  }

  // Use state to keep track of the currently selected image index.
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedImage = images[selectedIndex];

  return (
    <div className={styles.gallery}>
      {/* Main selected image */}
      <div className={styles.mainImageWrapper}>
        <Image
          key={selectedImage.url} // Add key to force re-render on change
          src={selectedImage.url}
          alt={selectedImage.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={styles.mainImage}
          priority
        />
      </div>

      {/* Thumbnails list */}
      {images.length > 1 && (
        <div className={styles.thumbnails}>
          {images.map((image, index) => (
            <button
              key={index}
              className={`${styles.thumbnail} ${index === selectedIndex ? styles.active : ''}`}
              onClick={() => setSelectedIndex(index)}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="10vw"
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;

