/**
 * ProductDetails — Server Component (Hero Section)
 *
 * بخش اصلی صفحه محصول شامل:
 * - گالری تصاویر
 * - عنوان، shortDescription، قیمت
 * - لاجیک Stock FOMO (نشانگر موجودی هوشمند)
 * - دکمه افزودن به سبد خرید
 * - جدول مشخصات فنی (ProductSpecs)
 *
 * @param {{ product: object, breadcrumbItems: Array }} props
 */

import Image from 'next/image';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import ProductGallery from '@/components/products/ProductGallery/ProductGallery';
import ProductAddToCart from '@/components/products/ProductAddToCart/ProductAddToCart';
import ProductSpecs from '@/modules/products/ProductSpecs/ProductSpecs';
import DiscountCountdown from '@/components/ui/DiscountCountdown/DiscountCountdown';
import styles from './ProductDetails.module.scss';

// ── تابع کمکی: محاسبه حالت FOMO موجودی ─────────────────────────────────────
/**
 * @param {number} stock
 * @param {boolean} isAvailable
 * @returns {{ label: string, variant: 'success' | 'warning' | 'danger' }}
 */
function getStockStatus(stock, isAvailable) {
  if (!isAvailable || stock === 0) {
    return { label: 'ناموجود', variant: 'danger' };
  }
  if (stock > 0 && stock <= 10) {
    return { label: `تنها ${stock} عدد در انبار باقیست!`, variant: 'warning' };
  }
  return { label: 'موجود در انبار', variant: 'success' };
}

// ── تابع فرمت‌دهی قیمت به صورت فارسی ──────────────────────────────────────
function formatPrice(price) {
  const toman = typeof price === 'object' ? price?.toman : price;
  if (!toman && toman !== 0) return null;
  return toman.toLocaleString('fa-IR');
}

export default function ProductDetails({ product, breadcrumbItems }) {
  const {
    stock = 0,
    isAvailable = true,
    specifications = [],
    discountPercent = 0,
    originalPrice,
    discountUntil
  } = product;

  // وضعیت موجودی
  const stockStatus = getStockStatus(stock, isAvailable);

  const finalToman = typeof product.price === 'object' ? product.price?.toman : product.price;
  const numOriginal = originalPrice ?? (typeof product.price === 'object' && product.price?.original ? product.price.original : finalToman);
  const hasDiscount = discountPercent > 0 && numOriginal > finalToman;

  return (
    <main className={styles.productPage}>
      <div className="container">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* ── Hero Grid: گالری | اطلاعات اصلی ──────────────────────────────── */}
        <div className={styles.layoutGrid}>

          {/* ستون چپ: گالری تصاویر */}
          <div className={styles.galleryCol}>
            <ProductGallery images={product.images} />
          </div>

          {/* ستون راست: اطلاعات محصول */}
          <div className={styles.infoCol}>

            {/* دسته‌بندی */}
            {product.categories?.length > 0 && (
              <div className={styles.categoryBadge}>
                {product.categories[0].name}
              </div>
            )}

            {/* عنوان */}
            <h1 className={styles.title}>{product.title}</h1>

            {/* توضیح کوتاه */}
            {product.shortDescription && (
              <p className={styles.shortDescription}>{product.shortDescription}</p>
            )}

            {/* ── بخش قیمت ────────────────────────────────────────────────── */}
            <div className={styles.priceBox}>
              {hasDiscount ? (
                <div className={styles.discountRow}>
                  <del className={styles.priceOriginal}>{formatPrice(numOriginal)} تومان</del>
                  <div className={styles.finalPriceWrap}>
                    <span className={styles.priceDiscount}>{formatPrice(finalToman)} تومان</span>
                    <span className={styles.discountBadge}>٪{discountPercent} تخفیف</span>
                  </div>
                </div>
              ) : (
                <span className={styles.price}>{formatPrice(finalToman)} تومان</span>
              )}
            </div>

            {/* ── شمارش معکوس تخفیف ────────────────────────────────────────── */}
            {hasDiscount && discountUntil && (
              <div className={styles.countdownSection}>
                <DiscountCountdown targetDate={discountUntil} compact={false} />
              </div>
            )}

            {/* ── نشانگر موجودی FOMO ──────────────────────────────────────── */}
            <div
              className={`${styles.stockBadge} ${styles[`stock--${stockStatus.variant}`]}`}
              role="status"
              aria-live="polite"
            >
              {/* نقطه چشمک‌زن */}
              <span className={styles.stockDot} aria-hidden="true" />
              <span className={styles.stockLabel}>{stockStatus.label}</span>
            </div>

            {/* ── دکمه افزودن به سبد ──────────────────────────────────────── */}
            <div className={styles.cartAction}>
              <ProductAddToCart product={product} />
            </div>

          </div>
        </div>

        {/* ── جدول مشخصات فنی ─────────────────────────────────────────────── */}
        <ProductSpecs specifications={specifications} />

      </div>
    </main>
  );
}
