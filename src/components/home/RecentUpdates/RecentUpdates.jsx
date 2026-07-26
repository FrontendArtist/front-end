/**
 * RecentUpdates — Server Component (4 Columns Layout)
 *
 * واکشی موازی داده‌ها و نمایش در ۴ ستون مجزا (محصولات، مقالات، خدمات، نظرات)
 */

import { getRecentUpdatesGrouped } from '@/lib/recentUpdatesApi';
import UpdateCard from '@/components/cards/UpdateCard/UpdateCard';
import styles from './RecentUpdates.module.scss';

const COLUMNS_CONFIG = [
  { key: 'products', title: 'محصولات جدید', icon: '📦', badgeType: 'product' },
  { key: 'articles', title: 'مقالات جدید', icon: '📝', badgeType: 'article' },
  { key: 'services', title: 'خدمات جدید', icon: '🛠️', badgeType: 'service' },
  { key: 'comments', title: 'نظرات اخیر',  icon: '💬', badgeType: 'comment' },
];

export default async function RecentUpdates() {
  const groupedData = await getRecentUpdatesGrouped();

  const totalItems = Object.values(groupedData).reduce((acc, arr) => acc + arr.length, 0);

  if (totalItems === 0) {
    return (
      <section className={styles.section} id="recent-updates">
        <header className={styles.header}>
          <h2 className={styles.title}>آخرین تغییرات</h2>
        </header>
        <p className={styles.empty}>در حال حاضر محتوایی برای نمایش وجود ندارد.</p>
      </section>
    );
  }

  return (
    <section className={styles.section} id="recent-updates">
      <header className={styles.header}>
        <h2 className={styles.title}>آخرین تغییرات سیستم</h2>
        <p className={styles.subtitle}>
          آخرین فعالیت‌ها و بروزرسانی‌های تفکیک‌شده در ۴ بخش
        </p>
      </header>

      {/* 4 Columns Grid Layout */}
      <div className={styles.columnsGrid}>
        {COLUMNS_CONFIG.map((col) => {
          const items = groupedData[col.key] || [];

          return (
            <div key={col.key} className={styles.column}>
              <div className={styles.columnHeader}>
                <h3 className={styles.columnTitle}>
                  <span className={styles.columnIcon}>{col.icon}</span>
                  {col.title}
                </h3>
                <span className={styles.columnBadge}>{items.length}</span>
              </div>

              <div className={styles.columnList}>
                {items.length > 0 ? (
                  items.map((item) => (
                    <UpdateCard key={item.id} item={item} />
                  ))
                ) : (
                  <p className={styles.columnEmpty}>آیتمی یافت نشد</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
