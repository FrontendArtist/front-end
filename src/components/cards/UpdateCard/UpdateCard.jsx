'use client';

import { useRouter } from 'next/navigation';
import styles from './UpdateCard.module.scss';

/**
 * تبدیل تاریخ به فرمت نسبی فارسی (مثل: «۳ روز پیش»)
 * @param {string} isoDate
 * @returns {string}
 */
function getRelativeDate(isoDate) {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);

  if (minutes < 1)   return 'همین لحظه';
  if (minutes < 60)  return `${minutes} دقیقه پیش`;
  if (hours   < 24)  return `${hours} ساعت پیش`;
  if (days    < 30)  return `${days} روز پیش`;
  if (days    < 365) return `${Math.floor(days / 30)} ماه پیش`;
  return `${Math.floor(days / 365)} سال پیش`;
}

/**
 * UpdateCard — آیتم لیستی (Tile) برای قرارگیری درون ستون‌های داشبورد
 */
const UpdateCard = ({ item }) => {
  const router = useRouter();

  if (!item) return null;

  const { title, href, createdAt } = item;
  const relativeDate = getRelativeDate(createdAt);

  const handleClick = () => {
    if (href) router.push(href);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`${styles.tile} ${href ? styles['tile--clickable'] : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={href ? 'button' : undefined}
      tabIndex={href ? 0 : undefined}
      aria-label={title}
    >
      <div className={styles.tile__main}>
        <h4 className={styles.title}>{title || '—'}</h4>
      </div>

      <div className={styles.tile__meta}>
        <time className={styles.date} dateTime={createdAt}>
          {relativeDate}
        </time>
        {href && <span className={styles.arrow} aria-hidden="true">←</span>}
      </div>
    </div>
  );
};

export default UpdateCard;
