'use client';
import Link from 'next/link';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockProducts } from '@/data/mock';
import styles from './ProductsSection.module.scss';

const ProductsSection = () => {
  // We use mock data for now. This will be replaced by an API call later.
  const products = mockProducts;

  /**
   * Function to render a single product card for the slider.
   * @param {object} product - The product data object.
   * @returns {React.ReactNode} The ProductCard component.
   */
  const renderProductCard = (product) => {
    return <ProductCard product={product} />;
  };

  return (
    <section className={`${styles.productsSection} section`}>
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