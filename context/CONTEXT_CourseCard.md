# Feature Context: CourseCard Component

## 1. REQUIRED DESIGN SYSTEM SNIPPETS (FOR AI USE)

### CSS Variables from `_variables.scss`:
```scss
:root {
  --color-card-text: #FFFAEA;
  --color-text-primary: #F6D982;
  --color-bg-primary: #061818;
  --color-title-hover: #F5C452;
  --font-lg: 20px;
  --font-md: 16px;
  --font-weight-medium: 500;
  --space-image-title-desktop: 32px;
  --space-title-text-desktop: 24px;
  --space-text-button-desktop: 24px;
}
2. Overall Goal
To create a reusable CourseCard component, visually similar to the ProductCard for consistency. It will display course information and a CTA to enroll.

3. Component Files
src/components/cards/CourseCard/CourseCard.jsx

src/components/cards/CourseCard/CourseCard.module.scss

4. JSX Structure (CourseCard.jsx)
JavaScript

import Image from 'next/image';
import Link from 'next/link';
import styles from './CourseCard.module.scss';

/**
 * A reusable card component to display course information.
 * @param {{
 * course: {
 * id: string | number;
 * slug: string;
 * image: { url: string; alt: string; };
 * title: string;
 * price: { toman: number; };
 * shortDescription?: string;
 * }
 * }} props
 */
const CourseCard = ({ course }) => {
  if (!course) return null;

  const { slug, image, title, price, shortDescription } = course;

  return (
    <Link href={`/courses/${slug}`} className={`${styles.courseCard} card vertical-gradient`}>
      <div className={styles.imageWrapper}>
        <Image
          src={image.url}
          alt={image.alt || title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={styles.courseImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={`${styles.cardTitle} card-title`}>{title}</h3>
        {shortDescription && <p className={`${styles.cardText} card-text`}>{shortDescription}</p>}
        <div className={styles.footer}>
          <span className={styles.price}>{price.toman === 0 ? 'رایگان' : `${price.toman.toLocaleString()} تومان`}</span>
          <div className={`${styles.ctaButton} card-button`}>
            ثبت‌نام در دوره
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
5. SCSS Styling (CourseCard.module.scss)
Create SCSS styles that are visually consistent with the ProductCard.

The main container (.courseCard) should use the global .card class.

The layout (image, content, footer) should be identical to ProductCard to maintain visual harmony.

Ensure the shortDescription is limited to 2 lines with an ellipsis for overflow.

Use the CSS variables provided in Section 1.

Important: The CTA button here is a div, not a button, because the entire card is a link. Style the div to look exactly like a button.

