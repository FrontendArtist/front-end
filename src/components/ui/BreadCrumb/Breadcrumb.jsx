// File: src/components/ui/Breadcrumb.jsx
import Link from 'next/link';
import Script from 'next/script';
import { Home, ChevronLeft } from 'lucide-react';
import styles from './Breadcrumb.module.scss';

// تولید JSON-LD برای گوگل (SEO)
const generateJsonLd = (items) => {
  const baseSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href ? `${baseSiteUrl}${item.href}` : undefined
    })),
  };
};

export default function Breadcrumb({ items = [] }) {
  if (!items || !items.length) return null;

  const schema = generateJsonLd(items);

  return (
    <nav className={styles.breadcrumbNav} aria-label="مسیر راهنما">
      <div className={styles.breadcrumbCard}>
        <ol className={styles.list}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isHome = index === 0;
            const isActive = isLast || item.active;

            return (
              <li key={index} className={styles.item}>
                {index > 0 && (
                  <span className={styles.separator} aria-hidden="true">
                    <ChevronLeft className={styles.separatorIcon} />
                  </span>
                )}

                {item.href && !isActive ? (
                  <Link href={item.href} className={styles.link} title={item.label}>
                    {isHome ? (
                      <span className={styles.homeItem}>
                        <Home className={styles.homeIcon} />
                        <span className={styles.linkLabel}>{item.label}</span>
                      </span>
                    ) : (
                      <span className={styles.linkLabel}>{item.label}</span>
                    )}
                  </Link>
                ) : (
                  <span className={styles.current} aria-current={isActive ? 'page' : undefined} title={item.label}>
                    {isHome && <Home className={styles.homeIcon} />}
                    <span className={styles.currentLabel}>{item.label}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      
      {/* اسکیما به صورت بهینه تزریق می‌شود */}
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </nav>
  );
}