/**
 * ProductCategoriesSection Component
 * This section now uses live Strapi categories via API Layer abstraction.
 * 
 * Displays main product categories fetched from Strapi (parent=null)
 * Data flow: HomePage → /api/home → getAllCategories() → formatStrapiCategories() → ProductCategoriesSection
 */

'use client';

import Link from 'next/link';
import CategoryCard from '@/components/cards/CategoryCard/CategoryCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import styles from './ProductCategoriesSection.module.scss';

const ProductCategoriesSection = ({ data = [], serverError = false }) => {
  const categories = data;
  const renderCategoryCard = (category) => {
    return <CategoryCard category={category} />;
  };

  const servicesBreakpoints = {
    0: { slidesPerView: 1, spaceBetween: 15 },
    440: { slidesPerView: 2, spaceBetween: 15 },
    768: { slidesPerView: 2, spaceBetween: 20 },
    1024: { slidesPerView: 4, spaceBetween: 30 },
    1280: { slidesPerView: 6, spaceBetween: 30 },
  };

  const hasError = serverError;
  const isEmpty = !categories || categories.length === 0;

  return (
    <section className={`${styles.categoriesSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>دسته بندی</h2>
          <Link href="/products" className={styles.viewAllLink}>
            مشاهده همه دسته بندی ها ...
          </Link>
        </header>
        {hasError ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-error)' }}>ارتباط با سرور برقرار نشد.</p>
        ) : isEmpty ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>در حال حاضر دسته‌بندی وجود ندارد.</p>
        ) : (
          <div className={styles.sliderWrapper}>
            <BaseSlider
              items={categories}
              renderItem={renderCategoryCard}
              slidesPerView={6}
              loop={true}
              breakpoints={servicesBreakpoints}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCategoriesSection;

