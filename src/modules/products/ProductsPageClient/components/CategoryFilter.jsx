'use client';

import Image from 'next/image';
import styles from './CategoryFilter.module.scss';



const FALLBACK_IMAGE = '/images/placeholder.png';

export default function CategoryFilter({
  categories = [],
  activeCategory = '',
  activeSubCategory = '',
  onSelectCategory,
  onSelectSubCategory
}) {
  const normalizedCategories = Array.isArray(categories) ? categories : [];
  const selectedCategory = normalizedCategories.find(cat => cat.slug === activeCategory);
  
  console.log("CategoryFilter categories:", categories);
  console.log("CategoryFilter selectedCategory:", selectedCategory);
  
  const resolveImage = category => {
    const source = category?.image || category?.icon || category?.thumbnail;
    const url = source?.url || source?.src || FALLBACK_IMAGE;
    const alt =
    source?.alt ||
    source?.alternativeText ||
    category?.name ||
    category?.title ||
    'دسته‌بندی';
    
    return {
      url,
      alt,
      unoptimized: Boolean(url?.includes?.('picsum.photos'))
    };
  };
  
  const handleSelectCategory = slug => {
    onSelectCategory?.(slug || '');
  };
  
  const handleSelectSubCategory = slug => {
    onSelectSubCategory?.(slug || '');
  };
  
  const renderCategoryCard = category => {
    if (!category?.slug) return null;
    const { url, alt, unoptimized } = resolveImage(category);
    
    return (
      <button
        key={category.slug}
        type="button"
        className={styles.categoryCard}
        onClick={() => handleSelectCategory(category.slug)}
        aria-label={`مشاهده دسته ${category.name || category.title || ''}`}
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
        <span className={styles.categoryName}>{category.name || category.title}</span>
      </button>
    );
  };
  
  if (!selectedCategory) {
    return (
      <section className={styles.categoriesSection} aria-label="دسته‌بندی محصولات">
        <div className={styles.categoriesGrid}>
          {normalizedCategories.map(renderCategoryCard)}
        </div>
      </section>
    );
  }

  const { url, alt, unoptimized } = resolveImage(selectedCategory);
  const subCategories = Array.isArray(selectedCategory.subCategories)
  ? selectedCategory.subCategories
  : [];
  
  return (
    <section
    className={`${styles.categoriesSection} ${styles.selectedState}`}
    aria-label={`زیر‌دسته‌های ${selectedCategory.name || selectedCategory.title || ''}`}
    >
      <div className={styles.selectedLayout}>
        <div className={styles.selectedColumn}>
          <div className={styles.selectedCard}>
            <div className={styles.selectedMeta}>
              <span className={styles.selectedLabel}>دسته فعال</span>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => handleSelectCategory('')}
                >
                بازگشت
              </button>
            </div>
            <div className={styles.selectedCategoryCard}>
              <div className={styles.iconWrapper}>
                <Image
                  src={url}
                  alt={alt}
                  width={64}
                  height={64}
                  unoptimized={unoptimized}
                  />
              </div>
              <span className={styles.categoryName}>
                {selectedCategory.name || selectedCategory.title}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.subCategoriesColumn}>
          <div className={styles.subHeader}>
            <span className={styles.subTitle}>زیر‌دسته‌ها</span>
            {subCategories.length > 0 && (
              <span className={styles.subCount}>{subCategories.length} مورد</span>
            )}
          </div>

          {subCategories.length > 0 ? (
            <div className={styles.subList}>
              <button
                type="button"
                className={`${styles.subItem} ${!activeSubCategory ? styles.subItemActive : ''}`}
                onClick={() => handleSelectSubCategory('')}
              >
                همه زیر‌دسته‌ها
              </button>

              {subCategories.map(sub => (
                <button
                key={sub.slug}
                type="button"
                className={`${styles.subItem} ${
                  activeSubCategory === sub.slug ? styles.subItemActive : ''
                  }`}
                  onClick={() => handleSelectSubCategory(sub.slug)}
                >
                  {sub.name || sub.title}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.subEmpty}>برای این دسته زیر‌دسته‌ای ثبت نشده است.</p>
          )}
        </div>
      </div>
    </section>
  );
}
