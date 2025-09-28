import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductCard.module.scss';
import AddToCartButton from './AddToCartButton';

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
          <AddToCartButton />
        </div>
      </div>
    </Link>
  );
};

export default ProductCard; 