// /**
//  * CategoryProductsGrid Component
//  * نمایش گرید محصولات دسته‌بندی با استفاده از ProductCard
//  */

// import ProductCard from '@/components/cards/ProductCard/ProductCard';
// import EmptyState from '@/components/ui/EmptyState/EmptyState';
// import styles from './CategoryProductsGrid.module.scss';

// const CategoryProductsGrid = ({ items = [] }) => {
//   if (!items?.length) {
//     return <EmptyState title="محصولی در این دسته‌بندی یافت نشد" />;
//   }

//   return (
//     <div className={styles.grid}>
//       {items.map(product => (
//         <ProductCard key={product.id} product={product} />
//       ))}
//     </div>
//   );
// };

// export default CategoryProductsGrid;