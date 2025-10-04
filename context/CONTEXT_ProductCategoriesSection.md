# Feature Context: Product Categories Section for Home Page

## 1. Overall Goal
To create a section for the home page that showcases product categories in a slider, using the `BaseSlider` and `CategoryCard` components.

## 2. Component Files
- `src/modules/home/ProductCategoriesSection/ProductCategoriesSection.jsx`
- `src/modules/home/ProductCategoriesSection/ProductCategoriesSection.module.scss`

## 3. JSX Structure (`ProductCategoriesSection.jsx`)
The component will use the `BaseSlider` to display the `CategoryCard` components. Based on the UI image, it should show around 6 slides per view on desktop.

```jsx
import Link from 'next/link';
import CategoryCard from '@/components/cards/CategoryCard/CategoryCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockCategories } from '@/data/mock';
import styles from './ProductCategoriesSection.module.scss';

const ProductCategoriesSection = () => {
  const categories = mockCategories;

  const renderCategoryCard = (category) => {
    return <CategoryCard category={category} />;
  };

  return (
    <section className={`${styles.categoriesSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>دسته بندی</h2>
          <Link href="/categories" className={styles.viewAllLink}>
            مشاهده همه دسته بندی ها ...
          </Link>
        </header>
        <div className={styles.sliderWrapper}>
          <BaseSlider
            items={categories}
            renderItem={renderCategoryCard}
            slidesPerView={6}
            loop={false}
          />
        </div>
      </div>
    </section>
  );
};

export default ProductCategoriesSection;
4. SCSS Styling (ProductCategoriesSection.module.scss)
The styling will be very minimal and similar to our other homepage sections.

The main container should use the global .section class.

The header (.header) should use Flexbox with space-between alignment.

Add a top margin to the slider wrapper (.sliderWrapper)