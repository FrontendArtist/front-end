# Feature Context: TestimonialCard Component

## 1. Goal
Create a simple card to display a single testimonial, matching the provided UI image.

## 2. Files
- `src/components/cards/TestimonialCard/TestimonialCard.jsx`
- `src/components/cards/TestimonialCard/TestimonialCard.module.scss`

## 3. JSX (`TestimonialCard.jsx`)
The JSX structure remains the same.
```jsx
import Image from 'next/image';
import styles from './TestimonialCard.module.scss';

const TestimonialCard = ({ testimonial }) => {
  if (!testimonial) return null;
  const { author, text } = testimonial;

  return (
    <div className={styles.testimonialCard}>
      <div className={styles.header}>
        <span className={styles.author}>{author}</span>
        <Image src="/icons/user-icon.svg" alt="User Icon" width={24} height={24} />
      </div>
      <p className={styles.text}>{text}</p>
    </div>
  );
};
export default TestimonialCard;
4. SCSS Styling (TestimonialCard.module.scss)
The styling must precisely match the UI image.

The main card (.testimonialCard) should be a rounded rectangle with a semi-transparent background and a thin border.

The header (.header) must use Flexbox to display the author and icon side-by-side, centered, with a gap between them. The icon should be on the right.

The main text (.text) should be centered and have appropriate line height.

Use global CSS variables for colors.

Example Implementation:

SCSS

.testimonialCard {
  background-color: rgba(6, 24, 24, 0.7); // Semi-transparent background
  border: 1px solid var(--color-text-primary);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  max-width: 500px; // Or adjust as needed
  margin: 0 auto; // Center the card within the slider
}

.header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.author {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-lg);
}

.text {
  color: var(--color-card-text);
  font-size: var(--font-md);
  line-height: var(--line-height-lg);
}