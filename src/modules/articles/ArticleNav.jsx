import Link from 'next/link';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import styles from './ArticleNav.module.scss';

/**
 * ArticleNav Component
 * نمایش ناوبری مقاله قبلی و بعدی با دو کارت کوچک و آیکون‌های جهت‌نما
 * 
 * @param {{
 *   prevArticle?: { slug: string, title: string } | null,
 *   nextArticle?: { slug: string, title: string } | null
 * }} props
 */
export default function ArticleNav({ prevArticle, nextArticle }) {
  if (!prevArticle && !nextArticle) {
    return null;
  }

  return (
    <nav className={styles.navContainer} aria-label="ناوبری مقالات">
      {prevArticle ? (
        <Link
          href={`/articles/${prevArticle.slug}`}
          className={`${styles.navCard} ${styles.prevCard}`}
        >
          <div className={styles.iconWrapper}>
            <ArrowRight size={20} className={styles.icon} />
          </div>
          <div className={styles.textGroup}>
            <span className={styles.label}>مقاله قبلی</span>
            <span className={styles.title} title={prevArticle.title}>
              {prevArticle.title}
            </span>
          </div>
        </Link>
      ) : (
        <div className={styles.placeholder} />
      )}

      {nextArticle ? (
        <Link
          href={`/articles/${nextArticle.slug}`}
          className={`${styles.navCard} ${styles.nextCard}`}
        >
          <div className={styles.textGroup}>
            <span className={styles.label}>مقاله بعدی</span>
            <span className={styles.title} title={nextArticle.title}>
              {nextArticle.title}
            </span>
          </div>
          <div className={styles.iconWrapper}>
            <ArrowLeft size={20} className={styles.icon} />
          </div>
        </Link>
      ) : (
        <div className={styles.placeholder} />
      )}
    </nav>
  );
}
