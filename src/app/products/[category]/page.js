/**
 * Category Listing Page
 * Path: /products/[category]
 * 
 * Data fetched via API Layer abstraction (productsApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO
 */

import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import { getProductsPaginated } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';
import { getProductBreadcrumbs } from '@/lib/breadcrumbs';
import ProductsPageClient from '@/modules/products/ProductsPageClient/ProductsPageClient';
import styles from '../products.module.scss';

export async function generateMetadata({ params }) {
  const { category } = await params;
  return {
    title: `محصولات دسته ${category} | فروشگاه آنلاین`,
    description: `مشاهده محصولات در دسته ${category}`,
  };
}

export default async function CategoryPage({ params, searchParams }) {
  // Await params and searchParams (Next.js 15 requirement)
  const { category } = await params;
  const sp = await searchParams;
  
  const page = Number(sp?.page || 1);
  const sort = sp?.sort || 'createdAt:desc';

  // Fetch category tree to find subcategories for this category
  const tree = await getCategoryTree();
  const currentCategory = tree.find(c => c.slug === category);
  
  let subSlugs = [];
  if (currentCategory?.subCategories?.length) {
    subSlugs = currentCategory.subCategories.map(s => s.slug);
  }

  const breadcrumbItems = getProductBreadcrumbs({
    category: currentCategory
  });

  // Fetch products for this category
  // We pass categorySlug to filter by this category (and its subcategories via subSlugs logic in API)
  const { data, meta } = await getProductsPaginated(page, 6, sort, {
    categorySlug: category,
    subSlugs
  });

  return (
    <main className={styles.main}>
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />
        <header className={styles.header}>
          <h1 className={styles.title}>محصولات: {currentCategory?.name || category}</h1>
        </header>

        <ProductsPageClient
          initialProducts={data}
          initialMeta={meta}
          categoriesSnapshot={JSON.stringify(tree)}
          initialSort={sort}
          initialCategory={category}
          initialSubCategory=""
        />
      </div>
    </main>
  );
}
