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