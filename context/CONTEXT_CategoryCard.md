# Feature Context: CategoryCard Component

## 1. Overall Goal
To create a small, simple card component to display a product category with an icon and a name. The entire card will be a clickable link.

## 2. Component Files
- `src/components/cards/CategoryCard/CategoryCard.jsx`
- `src/components/cards/CategoryCard/CategoryCard.module.scss`

## 3. JSX Structure (`CategoryCard.jsx`)
```jsx
import Image from 'next/image';
import Link from 'next/link';
import styles from './CategoryCard.module.scss';

/**
 * @param {{
 * category: {
 * slug: string;
 * name: string;
 * icon: string;
 * }
 * }} props
 */
const CategoryCard = ({ category }) => {
  if (!category) return null;

  const { slug, name, icon } = category;

  return (
    <Link href={`/categories/${slug}`} className={styles.categoryCard}>
      <div className={styles.iconWrapper}>
        <Image src={icon} alt={name} width={64} height={64} />
      </div>
      <h3 className={styles.name}>{name}</h3>
    </Link>
  );
};

export default CategoryCard;
4. SCSS Styling (CategoryCard.module.scss)
The card should have a transparent background that gets a subtle overlay or border on hover.

The content (icon and name) should be centered vertically and horizontally.

Use Flexbox with flex-direction: column and align-items: center.

The icon and name should have a noticeable gap.

Use global CSS variables for colors and fonts.

