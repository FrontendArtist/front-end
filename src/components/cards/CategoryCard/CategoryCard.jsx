import Image from 'next/image';
import Link from 'next/link';
import styles from './CategoryCard.module.scss';

/**
 * @param {{
 * category: {
 * slug: string;
 * name: string;
 * image: { url: string; alt: string } | null;
 * }
 * }} props
 */
const CategoryCard = ({ category }) => {
  if (!category) return null;

  const { slug, name, image } = category;
  const imageUrl = image?.url || '/images/placeholder.png';
  const imageAlt = image?.alt || name || 'بدون نام';

  return (
    <Link href={`/products/${slug}`} className={styles.categoryCard}>
      <div className={styles.iconWrapper}>
        <Image
          src={imageUrl}
          alt={imageAlt}
          width={64}
          height={64}
          unoptimized={imageUrl?.includes('picsum.photos') || false}
        />
      </div>
      <h3 className={styles.name}>{name}</h3>
    </Link>
  );
};

export default CategoryCard;
