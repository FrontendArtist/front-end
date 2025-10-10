import Image from 'next/image';
import { notFound } from 'next/navigation';
import ProductGallery from '@/components/products/ProductGallery/ProductGallery';
import { formatStrapiProducts } from '@/lib/strapiUtils';
import styles from './page.module.scss';

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

async function getProductBySlug(slug) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/products?populate=*&filters[slug][$eq]=${slug}`,
      { next: { revalidate: 60 } }
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.data || result.data.length === 0) return null;
    
    const formatted = formatStrapiProducts(result);
    return formatted[0];

  } catch (error) {
    console.error("Failed to fetch product by slug:", error);
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const response = await fetch(`${STRAPI_API_URL}/api/products`);
    const result = await response.json();
    return result.data.map((product) => ({
      slug: product.attributes.slug,
    }));
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: 'محصول یافت نشد' };
  }
  return {
    title: `${product.title} | فروشگاه آنلاین`,
    description: product.shortDescription,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className={styles.productPage}>
      <div className="container">
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

