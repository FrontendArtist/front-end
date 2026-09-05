/**
 * Product Single Page — Deep Nested Route
 * Path: /products/[category]/[subcategory]/[slug]
 *
 * ویژگی‌های این صفحه:
 * - JSON-LD Schema (Product + Offer) برای Rich Snippets گوگل
 * - Hero Section با لاجیک Stock FOMO
 * - محتوای عمیق Markdown از طریق ArticleReader
 * - جدول مشخصات فنی با ProductSpecs
 * - اسلایدر محصولات مرتبط
 * - بخش نظرات
 *
 * Architecture: Server Component — داده‌ها server-side fetch می‌شوند
 */

import { notFound } from 'next/navigation';
import { getCategoryTree } from '@/lib/categoriesApi';
import { getProductBySlug, getRelatedProducts } from '@/lib/productsApi';
import { getComments } from '@/lib/commentsApi';
import { getProductBreadcrumbs } from '@/lib/breadcrumbs';
import ProductDetails from '@/modules/products/ProductDetails/ProductDetails';
import RelatedProducts from '@/modules/products/RelatedProducts/RelatedProducts';
import ArticleReader from '@/app/articles/[slug]/ArticleReader';
import CommentsSection from '@/modules/comments/CommentsSection';
import styles from './page.module.scss';

// ── پارس امن Markdown ────────────────────────────────────────────────────────
/**
 * تبدیل Markdown به HTML با marked.parse
 * تمام خطاها را مدیریت می‌کند و در صورت شکست رشته خالی برمی‌گرداند
 *
 * @param {string | null} markdown
 * @returns {Promise<string>}
 */
async function safeParseMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';
  try {
    const { marked } = await import('marked');
    // پیکربندی ایمن: بدون HTML خام
    marked.setOptions({ breaks: true, gfm: true });
    const html = await marked.parse(markdown);
    return html;
  } catch (err) {
    console.warn('[ProductPage] خطا در پارس Markdown:', err?.message);
    return '';
  }
}

// ── ساخت JSON-LD اسکیمای محصول ──────────────────────────────────────────────
/**
 * اسکیمای استاندارد گوگل Product با Offer
 *
 * @param {object} product - داده‌های فرمت‌شده محصول
 * @param {string} pageUrl - آدرس کامل صفحه
 * @returns {object} JSON-LD schema
 */
function buildProductJsonLd(product, pageUrl) {
  const price = typeof product.price === 'object'
    ? product.price?.toman ?? 0
    : (product.price ?? 0);

  // تعیین وضعیت موجودی برای schema
  let availability = 'https://schema.org/InStock';
  if (!product.isAvailable || product.stock === 0) {
    availability = 'https://schema.org/OutOfStock';
  } else if (product.stock > 0 && product.stock <= 10) {
    availability = 'https://schema.org/LimitedAvailability';
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription || '',
    image: product.image?.url || product.images?.[0]?.url || '',
    url: pageUrl,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price: price,
      availability: availability,
      url: pageUrl,
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

import { SITE_NAME, SITE_URL } from '@/lib/constants';

// =============================================================================
// generateMetadata — متادیتای داینامیک SEO
// =============================================================================

export async function generateMetadata({ params }) {
  const { slug, category, subcategory } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: 'محصول یافت نشد' };
  }

  const pageUrl = `${SITE_URL}/products/${category}/${subcategory}/${slug}`;

  return {
    title: product.title,
    description: product.shortDescription || product.title,
    openGraph: {
      title: product.title,
      description: product.shortDescription || '',
      images: product.image?.url ? [{ url: product.image.url }] : [],
      url: pageUrl,
      type: 'website',
    },
    alternates: {
      canonical: pageUrl,
    }
  };
}

// =============================================================================
// Page Component — Server Component
// =============================================================================

export default async function ProductPage({ params }) {
  const { category, subcategory, slug } = await params;

  // ── واکشی موازی داده‌ها ──────────────────────────────────────────────────
  const product = await getProductBySlug(slug);

  // اگر محصول پیدا نشد → 404
  if (!product) {
    notFound();
  }

  // استخراج slug دسته اول برای محصولات مرتبط
  const primaryCategory = product.categories?.find((c) => c.slug) || product.categories?.[0];
  const categorySlugForRelated = primaryCategory?.slug || category;

  // واکشی موازی: نظرات + محصولات مرتبط + درخت دسته‌بندی + پارس Markdown
  const [initialComments, relatedProducts, tree, parsedContent] = await Promise.all([
    getComments('product', product.documentId),
    getRelatedProducts({
      currentId: product.id,
      currentSlug: product.slug,
      categorySlug: categorySlugForRelated,
      limit: 6,
    }),
    getCategoryTree(),
    safeParseMarkdown(product.content),
  ]);

  // ── ساخت Breadcrumb ──────────────────────────────────────────────────────
  const currentCategory = tree.find((c) => c.slug === category);
  const currentSubCategory = currentCategory?.subCategories?.find(
    (s) => s.slug === subcategory
  );

  const breadcrumbItems = getProductBreadcrumbs({
    category: currentCategory,
    subcategory: currentSubCategory,
    product: product,
  });

  // ── ساخت JSON-LD ─────────────────────────────────────────────────────────
  const pageUrl = `${SITE_URL}/products/${category}/${subcategory}/${slug}`;
  const jsonLd = buildProductJsonLd(product, pageUrl);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      {/* ── JSON-LD Schema برای Rich Snippets گوگل ──────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero Section: گالری + اطلاعات + Stock FOMO + مشخصات ─────────── */}
      <ProductDetails product={product} breadcrumbItems={breadcrumbItems} />

      {/* ── محتوای عمیق (Rich Text / ArticleReader) ─────────────────────── */}
      {parsedContent && (
        <div className={`container ${styles.contentSection}`}>
          <ArticleReader content={parsedContent} />
        </div>
      )}

      {/* ── محصولات مرتبط ────────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className={`container ${styles.relatedSection}`}>
          <RelatedProducts products={relatedProducts} />
        </div>
      )}

      {/* ── بخش نظرات ────────────────────────────────────────────────────── */}
      <div className={`container ${styles.commentsSection}`}>
        <CommentsSection
          entityType="product"
          entityId={product.documentId}
          initialComments={initialComments}
        />
      </div>
    </>
  );
}
