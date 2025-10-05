'use client';
import Link from 'next/link';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockArticles } from '@/data/mock';
import styles from './ArticlesSection.module.scss';

const ArticlesSection = () => {
  const renderArticleCard = (article) => <ArticleCard article={article} />;

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
            items={mockArticles}
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

