'use client';
import Link from 'next/link';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import styles from './ArticlesSection.module.scss';

const ArticlesSection = ({ data = [] }) => {
  const renderArticleCard = (article) => <ArticleCard article={article} />;

  // Show fallback message if no articles available
  if (!data || data.length === 0) {
    return (
      <section className={`${styles.articlesSection} section`}>
        <div className="container">
          <header className={styles.header}>
            <h2 className={styles.title}>مقالات</h2>
            <Link href="/articles" className={styles.viewAllLink}>
              مشاهده همه مقالات ...
            </Link>
          </header>
          <p style={{ textAlign: 'center', padding: '2rem' }}>در حال حاضر مقاله‌ای وجود ندارد.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.articlesSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>مقالات</h2>
          <Link href="/articles" className={styles.viewAllLink}>
            مشاهده همه مقالات ...
          </Link>
        </header>
        <div className={styles.sliderWrapper}>
          <BaseSlider
            items={data}
            renderItem={renderArticleCard}
            slidesPerView={3}
            loop={true}
          />
        </div>
      </div>
    </section>
  );
};

export default ArticlesSection;

