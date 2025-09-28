دقت کن که همه چیز طبق پرامپت و متن های زیر پیش بره نیا از خودت دوباره نام گذاری و استایل دهی کن !
# Feature Context: ProductCard Component

## 1. Overall Goal
To create a reusable, presentational `ProductCard` component. This component will display key product information (image, title, price, description) and a call-to-action button. It must be styled according to the global design system and be responsive.

**Note:** This is the display-only version. State logic for quantity and cart interactions will be added later.

## 2. Component Files
Create the following files:
- `src/components/cards/ProductCard/ProductCard.jsx`
- `src/components/cards/ProductCard/ProductCard.module.scss`

## 3. JSX Structure (`ProductCard.jsx`)
The component should accept product data via props. Use JSDoc for prop types. The main link should wrap the entire card for better UX.

```jsx
import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductCard.module.scss';

/**
 * A reusable card component to display product information.
 * @param {{
 * id: string | number;
 * slug: string;
 * image: { url: string; alt: string; };
 * title: string;
 * price: { toman: number; };
 * shortDescription?: string;
 * }} product - The product data to display.
 */
const ProductCard = ({ product }) => {
  // Add a guard clause for when product data is not available
  if (!product) return null;

  const { slug, image, title, price, shortDescription } = product;

  return (
    <Link href={`/products/${slug}`} className={`${styles.productCard} card vertical-gradient`}>
      <div className={styles.imageWrapper}>
        <Image
          src={image.url}
          alt={image.alt || title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={styles.productImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={`${styles.cardTitle} card-title`}>{title}</h3>
        {shortDescription && <p className={`${styles.cardText} card-text`}>{shortDescription}</p>}
        <div className={styles.footer}>
          <span className={styles.price}>{price.toman.toLocaleString()} تومان</span>
          <button className={`${styles.ctaButton} card-button`} onClick={(e) => e.preventDefault()}>
            افزودن به سبد
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;