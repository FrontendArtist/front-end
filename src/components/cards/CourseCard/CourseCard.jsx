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
    <div className={`${styles.courseCard} card`}>
      <div className={styles.imageWrapper}>
        <Image
          src={image.url}
          alt={image.alt || title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={styles.courseImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardText}>{shortDescription}</p>
        <Link href={`/courses/${slug}`} className={`${styles.ctaButton} card-button`}>
          بیشتر بدانید
        </Link>
      </div>
    </div>
  );
};

export default CourseCard; 