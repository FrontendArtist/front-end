'use client';
import styles from './CategoryFilter.module.scss';

export default function CategoryFilter({
  categories = [],
  activeCategory = '',
  activeSubCategory = '',
  onSelectCategory,
  onSelectSubCategory
}) {
  const selected = categories.find(c => c.slug === activeCategory);

  // حالت 1: هیچ دسته‌ای انتخاب نشده
  if (!activeCategory) {
    return (
      <div className={styles.categoryBar}>
        {categories.map(c => (
          <button
            key={c.id}
            className={styles.categoryPill}
            onClick={() => onSelectCategory?.(c.slug)}
            type="button"
            aria-label={`انتخاب دسته ${c.name}`}
          >
            {c.name}
          </button>
        ))}
      </div>
    );
  }

  // حالت 2: یک دسته انتخاب شده (دسته بزرگ راست + زیر‌دسته‌ها چپ)
  return (
    <div className={styles.categoryLayout}>
      <div className={styles.rightSelected}>
        <div className={styles.selectedBox}>
          <span className={styles.selectedTitle}>{selected?.name || activeCategory}</span>
          <button className={styles.backBtn} onClick={() => onSelectCategory?.('')} type="button" aria-label="بازگشت">
            بازگشت
          </button>
        </div>
      </div>
      <div className={styles.leftSubcats}>
        {(selected?.subCategories || []).map(sub => (
          <button
            key={sub.id}
            className={`${styles.subPill} ${activeSubCategory === sub.slug ? styles.active : ''}`}
            onClick={() => onSelectSubCategory?.(sub.slug)}
            type="button"
            aria-pressed={activeSubCategory === sub.slug}
            aria-label={`زیر‌دسته ${sub.name}`}
          >
            {sub.name}
          </button>
        ))}
      </div>
    </div>
  );
}

