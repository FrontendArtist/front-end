

// /**
//  * SubcategoryList Component
//  * نمایش لیست زیردسته‌ها با لینک
//  */

// import Link from 'next/link';
// import styles from './SubcategoryList.module.scss';

// const SubcategoryList = ({ items = [], parentSlug }) => {
//   if (!items?.length) return null;

//   return (
//     <div className={styles.list}>
//       <h2 className={styles.title}>زیردسته‌ها</h2>
//       <div className={styles.items}>
//         {items.map(subcategory => (
//           <Link
//             key={subcategory.id}
//             href={`/category/${parentSlug}/${subcategory.slug}`}
//             className={styles.item}
//           >
//             {subcategory.name}
//           </Link>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default SubcategoryList;