/**
 * RelatedProductCTA Component
 * 
 * 📌 این کامپوننت هم دوره‌های آموزشی متصل‌شده (featured_course) و هم محصولات متصل‌شده (featured_product)
 * را به‌صورت مجزا یا هم‌زمان با استایل فوق‌العاده شکیل، کاور باکیفیت، قیمت تومان و دکمه اکشن اختصاصی رندر می‌کند.
 * 
 * @param {{
 *   enableCta?: boolean,
 *   items?: Array,
 *   ctaItems?: Array,
 *   item?: object,
 *   course?: object,
 *   product?: object,
 *   ctaData?: object
 * }} props
 */

import Image from 'next/image';
import Link from 'next/link';
import { GraduationCap, ShoppingBag, ArrowLeft, Sparkles } from 'lucide-react';
import styles from './RelatedProductCTA.module.scss';

export default function RelatedProductCTA({ enableCta = true, items, ctaItems, item, course, product, ctaData }) {
  // پشتیبانی انعطاف‌پذیر از تمام فرمت‌های ورودی (items, ctaItems, item, ctaData, course, product)
  let rawList = items || ctaItems || ctaData || item || course || product || [];

  // هموارسازی کامل آرایه‌های متداخل جهت جلوگیری از باگ آرایه‌های دو بعدی
  let itemList = Array.isArray(rawList)
    ? rawList.flat(Infinity).filter(Boolean)
    : [rawList].filter(Boolean);

  // شرط رندر: اگر کلید CTA غیرفعال باشد یا آیتمی متصل نشده باشد، هیچی رندر نشود
  if (enableCta === false || itemList.length === 0) {
    return null;
  }

  return (
    <div className={styles.ctaWrapper}>
      {itemList.map((target, index) => {
        const isProduct = target.type === 'product' || (!target.type && !!target.categories);

        const {
          id,
          title,
          slug,
          price,
          discountPrice,
          originalPrice,
          image,
          cover,
          shortDescription,
          description,
        } = target;

        // استخراج آدرس تصویر کاور
        const coverUrl =
          typeof image === 'string'
            ? image
            : image?.url || cover?.url || '/images/forempties2.png';

        const coverAlt =
          (typeof image === 'object' && image?.alt) || cover?.alt || title || 'تصویر کاور';

        // استخراج و فرمت‌دهی قیمت به تومان ایران
        const numericPrice = typeof price === 'object' ? price?.toman || 0 : (typeof price === 'number' ? price : 0);
        const numericDiscountPrice = typeof discountPrice === 'number' ? discountPrice : null;
        const numericOriginalPrice = typeof originalPrice === 'number' ? originalPrice : null;

        // محاسبه قیمت نهایی و قیمت خط‌خورده
        const finalPrice = numericDiscountPrice !== null ? numericDiscountPrice : numericPrice;
        const strikethroughPrice = numericDiscountPrice !== null ? numericPrice : (numericOriginalPrice && numericOriginalPrice > numericPrice ? numericOriginalPrice : null);

        const formattedFinalPrice = finalPrice > 0 ? finalPrice.toLocaleString('fa-IR') : null;
        const formattedStrikethroughPrice = strikethroughPrice ? strikethroughPrice.toLocaleString('fa-IR') : null;

        const excerptText = shortDescription || (typeof description === 'string' ? description : (isProduct ? 'محصول ویژه مرتبط جهت سفارش مستقیم' : 'دوره آموزشی ویژه و تخصصی جهت رشد و ارتقای آگاهی'));

        const badgeText = isProduct ? 'پیشنهاد ویژه محصول مرتبط' : 'پیشنهاد ویژه دوره مرتبط';
        const tagLabel = isProduct ? 'محصول مرتبط' : 'دوره آموزشی مرتبط';
        const IconComponent = isProduct ? ShoppingBag : GraduationCap;
        const ctaBtnText = isProduct ? 'مشاهده و خرید محصول' : 'مشاهده و ثبت‌نام در دوره';
        const targetLink = isProduct ? `/products/${slug}` : `/courses/${slug}`;

        return (
          <section key={id || slug || index} className={styles.ctaBanner} aria-label="پیشنهاد ویژه مرتبط با مقاله">
            <div className={styles.container}>
              {/* تصویر کاور دوره/محصول و نشان (Badge) */}
              <div className={styles.imageColumn}>
                <div className={styles.imageWrapper}>
                  <Image
                    src={coverUrl}
                    alt={coverAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.coverImage}
                  />
                  <div className={styles.badge}>
                    <Sparkles size={14} className={styles.badgeIcon} />
                    <span>{badgeText}</span>
                  </div>
                </div>
              </div>

              {/* جزییات دوره/محصول، قیمت و دکمه لینک */}
              <div className={styles.contentColumn}>
                <div className={styles.metaHeader}>
                  <span className={styles.typeTag}>
                    <IconComponent size={16} />
                    <span>{tagLabel}</span>
                  </span>
                </div>

                <h3 className={styles.title}>{title}</h3>

                {excerptText && <p className={styles.excerpt}>{excerptText}</p>}

                <div className={styles.footerRow}>
                  <div className={styles.priceContainer}>
                    {formattedFinalPrice ? (
                      <div className={styles.priceGroup}>
                        {formattedStrikethroughPrice && (
                          <span className={styles.originalPrice}>
                            {formattedStrikethroughPrice} تومان
                          </span>
                        )}
                        <div className={styles.currentPrice}>
                          <span className={styles.amount}>{formattedFinalPrice}</span>
                          <span className={styles.unit}>تومان</span>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.freePrice}>رایگان</div>
                    )}
                  </div>

                  <Link href={targetLink} className={styles.ctaButton}>
                    <span>{ctaBtnText}</span>
                    <ArrowLeft size={18} className={styles.btnIcon} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
