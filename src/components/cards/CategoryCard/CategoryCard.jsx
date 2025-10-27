/**
 * CategoryCard Component
 * This section now uses live Strapi categories via API Layer abstraction.
 * 
 * Displays a single category card with icon and name.
 * Icon URL is prefixed with STRAPI_API_URL in strapiUtils.formatSingleImage()
 */

import Image from 'next/image';
import Link from 'next/link';
import styles from './CategoryCard.module.scss';

/**
 * @param {{
 * category: {
 * slug: string;
 * name: string;
 * icon: string; // Full URL from Strapi (already prefixed)
 * }
 * }} props
 */
const CategoryCard = ({ category }) => {
  if (!category) return null;

  const { slug, name, icon } = category;

  return (
    <Link href={`/categories/${slug}`} className={styles.categoryCard}>
      <div className={styles.iconWrapper}>
        <Image 
          src={icon} 
          alt={name} 
          width={64} 
          height={64}
          unoptimized={icon.includes('picsum.photos')}
        />
      </div>
      <h3 className={styles.name}>{name}</h3>
    </Link>
  );
};

export default CategoryCard;

