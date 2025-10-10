# Feature Context: ProductGallery Client Component

## 1. Goal
To create an interactive image gallery for the single product page. It will display a large selected image and a list of thumbnails. Clicking a thumbnail should change the main image. This must be a client component.

## 2. Component Files
- `src/components/products/ProductGallery/ProductGallery.jsx`
- `src/components/products/ProductGallery/ProductGallery.module.scss`

## 3. JSX Structure (`ProductGallery.jsx` with comments)
```jsx
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
4. SCSS (ProductGallery.module.scss)
SCSS

/* Main gallery container */
.gallery {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Wrapper for the large, selected image */
.mainImageWrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1; /* Make it a square */
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--color-text-primary);
}

.mainImage {
  object-fit: cover;
}

/* Container for the list of thumbnails */
.thumbnails {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.75rem;
}

/* Individual thumbnail button */
.thumbnail {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--color-title-hover);
  }

  /* Style for the currently active thumbnail */
  &.active {
    border-color: var(--color-text-primary);
  }
}

.thumbnailImage {
  object-fit: cover;
}