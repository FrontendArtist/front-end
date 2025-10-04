import Image from 'next/image';
import Link from 'next/link';
import styles from './ArticleCard.module.scss';

/**
 * A reusable card component to display article information.
 * @param {{
 * article: {
 * id: string | number;
 * slug: string;
 * cover: { url: string; alt: string; };
 * title: string;
 * date: string;
 * excerpt?: string;
 * }
 * }} props
 */
const ArticleCard = ({ article }) => {
  if (!article) return null;

  const { slug, cover, title, date, excerpt } = article;
  
  // A simple date formatting function
  const formattedDate = new Date(date).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link href={`/articles/${slug}`} className={`${styles.articleCard} card`}>
      <div className={styles.imageWrapper}>
        <Image
          src={cover.url}
          alt={cover.alt || title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={styles.articleImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardExcerpt}>{excerpt}</p>
        <div className={styles.footer}>
          <span className={styles.date}>{formattedDate}</span>
        </div>
      </div>
    </Link>
  );
};

export default ArticleCard; 