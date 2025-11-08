/**
 * Product Single Page - Deep Path (/products/[category]/[subcategory]/[slug])
 */

import { notFound } from 'next/navigation';
import ProductGallery from '@/components/products/ProductGallery/ProductGallery';
import { getProductBySlug } from '@/lib/productsApi';
import styles from '../../../[slug]/page.module.scss';

export async function generateMetadata({ params }) {
  const { category, subcategory, slug } = await params;
  const product = await getProductBySlug(slug);

  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  const canonical = `${base}/products/${category}/${subcategory}/${slug}`;

  if (!product) {
    return {
      title: 'محصول یافت نشد',
      alternates: { canonical },
    };
  }

  return {
    title: `${product.title} | فروشگاه آنلاین`,
    description: product.shortDescription,
    alternates: { canonical },
  };
}

export default async function ProductDeepPage({ params }) {
  const { slug, category, subcategory } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription || '',
    image: Array.isArray(product.images) ? product.images.map(i => i.url) : [],
    sku: product.id,
    brand: { '@type': 'Brand', name: 'Tarh Elahi' },
    category: `${category}/${subcategory}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price: product?.price?.toman || 0,
      availability: 'https://schema.org/InStock',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/products/${category}/${subcategory}/${slug}`,
    },
  };

  return (
    <main className={styles.productPage}>
      <div className="container">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className={styles.layoutGrid}>
          <div className={styles.gallery}>
            <ProductGallery images={product.images} />
          </div>

          <div className={styles.details}>
            <h1 className={styles.title}>{product.title}</h1>
            <div className={styles.price}>{product.price.toman.toLocaleString()} تومان</div>
            <p className={styles.description}>{product.shortDescription}</p>
            <button className="card-button">افزودن به سبد خرید</button>
          </div>
        </div>
      </div>
    </main>
  );
}


