// File: src/components/ui/Breadcrumb.jsx
import Link from 'next/link';
import Script from 'next/script';
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
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={index} className={item.active ? styles.activeItem : styles.item}>
            {item.href && !item.active ? (
              <Link href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.current}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
      
      {/* اسکیما به صورت بهینه تزریق می‌شود */}
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </nav>
  );
}