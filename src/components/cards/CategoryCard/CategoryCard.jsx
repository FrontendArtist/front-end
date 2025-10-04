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

