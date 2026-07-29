import Link from 'next/link';
import { Tag } from 'lucide-react';
import styles from './ArticleTags.module.scss';

/**
 * ArticleTags Component
 * نمایش تگ‌های مقاله به صورت کپسولی (Pill) شکیل
 * 
 * @param {{ tags: Array<string | { name: string, slug: string }> }} props
 */
export default function ArticleTags({ tags }) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  // نرمال‌سازی تگ‌ها برای پشتیبانی هم‌زمان از آرایه رشته‌ها و آبجکت‌ها
  const normalizedTags = tags
    .map((tag) => {
      if (typeof tag === 'string') {
        const trimmed = tag.trim();
        return trimmed ? { name: trimmed, slug: trimmed } : null;
      }
      if (typeof tag === 'object' && tag !== null) {
        const name = tag.name || tag.title || tag.slug || '';
        const slug = tag.slug || tag.name || tag.title || '';
        return name ? { name, slug } : null;
      }
      return null;
    })
    .filter(Boolean);

  if (normalizedTags.length === 0) {
    return null;
  }

  return (
    <section className={styles.tagsContainer} aria-label="برچسب‌های مقاله">
      <div className={styles.header}>
        <Tag className={styles.tagIcon} size={18} />
        <span className={styles.title}>برچسب‌ها:</span>
      </div>
      <div className={styles.tagsList}>
        {normalizedTags.map((tag, index) => (
          <Link
            key={tag.slug || index}
            href={`/articles?tag=${encodeURIComponent(tag.slug)}`}
            className={styles.tagPill}
          >
            #{tag.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
