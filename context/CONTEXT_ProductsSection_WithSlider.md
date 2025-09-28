# Feature Context: ProductsSection Component for Home Page (using BaseSlider)

## 1. Overall Goal
To create a dedicated section for the home page that showcases a selection of products inside a slider. The component will feature a title, a "View All" link, and will use the recently created `BaseSlider` component to display `ProductCard`s.

## 2. Component Files
Create the following files in a new `ProductsSection` directory within `src/modules/home/`:
- `src/modules/home/ProductsSection/ProductsSection.jsx`
- `src/modules/home/ProductsSection/ProductsSection.module.scss`

## 3. JSX Structure (`ProductsSection.jsx`)
The component will import `BaseSlider` and `ProductCard`. It will pass the mock product data to the slider and provide a `renderItem` function that tells the slider how to render each product using a `ProductCard`.

```jsx
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
4. SCSS Styling (ProductsSection.module.scss)
The styling for this component will be minimal, as the slider and cards have their own styles.

The main container (.productsSection) should use the global .section class for consistent padding.

The header (.header) should use Flexbox with justify-content: space-between to place the title and link on opposite ends.

Add some top margin to the slider wrapper (.sliderWrapper) to create space between the header and the slider.

