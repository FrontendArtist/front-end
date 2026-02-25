'use client';
import Link from 'next/link';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import styles from './ProductsSection.module.scss';

const ProductsSection = ({ data = [] }) => {
  const products = data;

  /**
   * Function to render a single product card for the slider.
   * @param {object} product - The product data object.
   * @returns {React.ReactNode} The ProductCard component.
   */
  const renderProductCard = (product) => {
    return <ProductCard product={product} />;
  };

  // Show fallback message if no products available
  if (!products || products.length === 0) {
    return (
      <section id="products-section" className={`${styles.productsSection} section`}>
        <div className="container">
          <header className={styles.header}>
            <h2 className={styles.title}>جدیدترین محصولات</h2>
            <Link href="/products" className={styles.viewAllLink}>
              مشاهده همه
            </Link>
          </header>
          <p style={{ textAlign: 'center', padding: '2rem' }}>در حال حاضر محصولی وجود ندارد.</p>
        </div>
      </section>
    );
  }

  return (
    <section  id="products-section" className={`${styles.productsSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>جدیدترین محصولات</h2>
          <Link href="/products" className={styles.viewAllLink}>
            مشاهده همه
          </Link>
        </header>
        <div className={styles.sliderWrapper}>
          <BaseSlider
            items={products}
            renderItem={renderProductCard}
            slidesPerView={4}
            loop={true}
          />
        </div>
      </div>
    </section>
  );
};

export default ProductsSection; 