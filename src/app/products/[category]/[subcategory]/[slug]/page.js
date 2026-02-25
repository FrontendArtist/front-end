/**
 * Product Single Page - Deep Nested Route
 * Path: /products/[category]/[subcategory]/[slug]
 * 
 * Data fetched via API Layer abstraction (productsApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO
 */

import { notFound } from 'next/navigation';
import { getCategoryTree } from '@/lib/categoriesApi';
import { getProductBySlug } from '@/lib/productsApi';
import { getComments } from '@/lib/commentsApi';
import { getProductBreadcrumbs } from '@/lib/breadcrumbs';
import ProductDetails from '@/modules/products/ProductDetails/ProductDetails';
import CommentsSection from '@/modules/comments/CommentsSection';

/**
 * Generate Dynamic Metadata for SEO
 * Uses API Layer abstraction
 */
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

/**
 * Product Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getProductBySlug() from productsApi.js (no direct fetch)
 * - Follows Repository Pattern for clean separation of concerns
 * - Handles invalid slugs with notFound()
 * - No redirect logic needed here as this is the destination
 */
export default async function ProductPage({ params }) {
  const { category, subcategory, slug } = await params;

  // Data fetched via API Layer abstraction
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Fetch comments for this product
  const initialComments = await getComments('product', product.documentId);

  const tree = await getCategoryTree();
  const currentCategory = tree.find((c) => c.slug === category);
  const currentSubCategory = currentCategory?.subCategories?.find((s) => s.slug === subcategory);

  const breadcrumbItems = getProductBreadcrumbs({
    category: currentCategory,
    subcategory: currentSubCategory,
    product: product
  });

  return (
    <>
      <ProductDetails product={product} breadcrumbItems={breadcrumbItems} />

      {/* Comments Section */}
      <div className="container">
        <CommentsSection
          entityType="product"
          entityId={product.documentId}
          initialComments={initialComments}
        />
      </div>
    </>
  );
}
