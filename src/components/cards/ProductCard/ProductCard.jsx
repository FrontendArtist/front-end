import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductCard.module.scss';
import AddToCartButton from './AddToCartButton';

/**
 * A reusable card component to display product information.
 * Constructs nested route URLs based on product categories.
 * 
 * @param {{
 * id: string | number;
 * slug: string;
 * image: { url: string; alt: string; };
 * title: string;
 * price: { toman: number; };
 * shortDescription?: string;
 * categories?: Array<{ slug: string; parent?: { slug: string } }>;
 * }} product - The product data to display.
 */
const ProductCard = ({ product }) => {
  if (!product) return null;

  const { slug, image, title, price, shortDescription, categories } = product;
  const formattedPrice = (typeof price === "object" ? price?.toman : price) || 0;

  /**
   * تشخیص مسیر کانونیکال بر اساس categories
   * اولویت‌بندی:
   * 1. اولین زیر‌دسته (دسته‌ای با parent)
   * 2. اولین دسته اصلی (بدون parent)
   * 3. Fallback به مسیر قدیمی (که redirect می‌شود)
   */
  const constructProductUrl = () => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      // Fallback: مسیر قدیمی که به canonical redirect می‌شود
      return `/product/${slug}`;
    }

    // اولویت 1: یافتن زیر‌دسته (دسته‌ای که parent دارد)
    const subcategory = categories.find(cat => cat.parent && cat.parent.slug);
    if (subcategory && subcategory.parent) {
      return `/products/${subcategory.parent.slug}/${subcategory.slug}/${slug}`;
    }

    // اولویت 2: یافتن دسته اصلی (بدون parent)
    const rootCategory = categories.find(cat => !cat.parent);
    if (rootCategory) {
      return `/products/${rootCategory.slug}/${slug}`;
    }

    // اولویت 3: Fallback اگر ساختار داده غیرمنتظره باشد
    return `/product/${slug}`;
  };

  const productUrl = constructProductUrl();

  return (
    <Link href={productUrl} className={`${styles.productCard} card vertical-gradient`}>
      <div className={styles.imageWrapper}>
        <Image
          src={image.url}
          alt={image.alt || title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={styles.productImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={`${styles.cardTitle} card-title`}>{title}</h3>
        {shortDescription && <p className={`${styles.cardText} card-text`}>{shortDescription}</p>}
        <div className={styles.footer}>
          {formattedPrice > 0 && <span className={styles.price}>{formattedPrice.toLocaleString()} تومان</span>}
          <AddToCartButton />
        </div>
      </div>
    </Link>
  );
};

export default ProductCard; 