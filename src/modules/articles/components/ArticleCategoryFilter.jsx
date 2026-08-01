'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './ArticleCategoryFilter.module.scss';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';

const FALLBACK_IMAGE = '/images/placeholder.png';

const CATEGORY_SLIDER_BREAKPOINTS = {
  0: { slidesPerView: 2, spaceBetween: 10 },
  480: { slidesPerView: 3, spaceBetween: 12 },
  640: { slidesPerView: 4, spaceBetween: 16 },
  1024: { slidesPerView: 5, spaceBetween: 20 },
  1280: { slidesPerView: 6, spaceBetween: 24 },
};

export default function ArticleCategoryFilter({ categories = [], activeSlug = '' }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const normalizedCategories = Array.isArray(categories) ? categories : [];

  const resolveImage = (category) => {
    const source = category?.image || category?.icon || category?.thumbnail;
    const url = source?.url || source?.src || FALLBACK_IMAGE;
    const alt = source?.alt || source?.alternativeText || category?.name || 'دسته‌بندی مقاله';

    return {
      url,
      alt,
      unoptimized: Boolean(url?.includes?.('picsum.photos'))
    };
  };

  const handleSelectCategory = (slug) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Toggle active category (click active category to deselect/clear filter)
    if (slug && slug !== activeSlug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    
    params.delete('page');
    
    router.push(`/articles?${params.toString()}`);
  };

  const renderCategoryCard = (category) => {
    if (!category?.slug) return null;
    
    const { url, alt, unoptimized } = resolveImage(category);
    const isActive = activeSlug === category.slug;

    return (
      <button
        key={category.slug}
        type="button"
        className={`${styles.categoryCard} ${isActive ? styles.categoryCardActive : ''}`}
        onClick={() => handleSelectCategory(category.slug)}
        aria-label={`مشاهده مقالات دسته ${category.name || ''}`}
        aria-current={isActive ? 'true' : undefined}
      >
        <div className={styles.iconWrapper}>
          <Image
            src={url}
            alt={alt}
            width={64}
            height={64}
            unoptimized={unoptimized}
          />
        </div>
        <span className={styles.categoryName}>{category.name}</span>
      </button>
    );
  };

  return (
    <section className={styles.categoriesSection} aria-label="دسته‌بندی مقالات">
      <BaseSlider
        items={normalizedCategories}
        renderItem={renderCategoryCard}
        slidesPerView={6}
        breakpoints={CATEGORY_SLIDER_BREAKPOINTS}
        loop={true}
      />
    </section>
  );
}
