'use client';

import { useState, useEffect } from 'react';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import { getRelatedArticles } from '@/lib/articlesApi';
import styles from './RelatedArticles.module.scss';

/**
 * RelatedArticles Component
 * نمایش اسلایدر مقالات هم‌دسته‌بندی با استثنا کردن مقاله جاری
 * 
 * @param {{
 *   currentId?: string | number,
 *   categoryId?: string | number,
 *   articles?: Array<object>
 * }} props
 */
export default function RelatedArticles({ currentId, categoryId, articles: initialArticles }) {
  const [articles, setArticles] = useState(initialArticles || []);
  const [loading, setLoading] = useState(!initialArticles && Boolean(currentId || categoryId));

  useEffect(() => {
    if (initialArticles) {
      setArticles(initialArticles);
      setLoading(false);
      return;
    }

    if (currentId || categoryId) {
      let isMounted = true;
      setLoading(true);

      getRelatedArticles({ categoryId, currentId })
        .then((data) => {
          if (isMounted) {
            setArticles(data || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setArticles([]);
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [currentId, categoryId, initialArticles]);

  if (loading) {
    return null;
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  const renderArticleCard = (article) => <ArticleCard article={article} />;

  return (
    <section className={styles.relatedSection} aria-label="مقالات مرتبط">
      <header className={styles.header}>
        <h2 className={styles.sectionTitle}>مقالات مرتبط</h2>
      </header>

      <div className={styles.sliderWrapper}>
        <BaseSlider
          items={articles}
          renderItem={renderArticleCard}
          slidesPerView={3}
          loop={articles.length > 3}
        />
      </div>
    </section>
  );
}
