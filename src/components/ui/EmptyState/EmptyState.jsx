/**
 * EmptyState Component
 * نمایش وضعیت خالی برای زمانی که داده‌ای موجود نیست
 */

import styles from './EmptyState.module.scss';

const EmptyState = ({ title = 'موردی یافت نشد' }) => {
  return (
    <div className={styles.emptyState}>
      <h2 className={styles.title}>{title}</h2>
    </div>
  );
};

export default EmptyState;