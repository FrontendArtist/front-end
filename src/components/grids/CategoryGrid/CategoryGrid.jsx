/**
 * CategoryGrid Component
 * نمایش گرید دسته‌بندی‌ها با استفاده از CategoryCard
 */

import CategoryCard from '@/components/cards/CategoryCard/CategoryCard';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import styles from './CategoryGrid.module.scss';

const CategoryGrid = ({ items = [] }) => {
  if (!items?.length) {
    return <EmptyState title="دسته‌بندی‌ای یافت نشد" />;
  }

  return (
    <div className={styles.grid}>
      {items.map(category => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
};

export default CategoryGrid;