/**
 * Hybrid Route Resolver: Subcategory Listing OR Product Detail Page
 * Path: /products/[category]/[subcategory]
 * 
 * Logic:
 * 1. Check if "subcategory" param is a valid subcategory → Render listing page
 * 2. If not, check if "subcategory" is a product slug → Render product detail page
 * 3. If neither, return notFound()
 * 
 * Data fetched via API Layer abstraction (productsApi.js, categoriesApi.js)
 * Implements Server-Side Rendering (SSR) for optimal SEO
 */

import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import { getProductsPaginated, getProductBySlug } from '@/lib/productsApi';
import { getCategoryTree } from '@/lib/categoriesApi';
import { getProductBreadcrumbs } from '@/lib/breadcrumbs';
import ProductsPageClient from '@/modules/products/ProductsPageClient/ProductsPageClient';
import ProductDetails from '@/modules/products/ProductDetails/ProductDetails';
import styles from '../../products.module.scss';

/**
 * Generate Dynamic Metadata
 * Determines if route is subcategory or product and generates appropriate metadata
 */
export async function generateMetadata({ params }) {
  const { category, subcategory } = await params;
  
  // First check if it's a valid subcategory
  const tree = await getCategoryTree();
  const currentCategory = tree.find(c => c.slug === category);
  const currentSubCategory = currentCategory?.subCategories?.find(s => s.slug === subcategory);
  
  if (currentSubCategory) {
    // It's a subcategory listing page
    return {
      title: `محصولات ${currentSubCategory.name || subcategory} | فروشگاه آنلاین`,
      description: `مشاهده محصولات در زیردسته ${currentSubCategory.name || subcategory} از دسته ${currentCategory?.name || category}`,
    };
  }
  
  // Check if it's a product
  const product = await getProductBySlug(subcategory);
  
  if (product) {
    // It's a product detail page
    return {
      title: `${product.title} | فروشگاه آنلاین`,
      description: product.shortDescription,
    };
  }
  
  // Neither subcategory nor product
  return {
    title: 'صفحه یافت نشد',
  };
}

/**
 * Hybrid Page Component (Server Component)
 * 
 * Route Resolution Logic:
 * 1. Fetch category tree
 * 2. Check if "subcategory" param is a valid subcategory of "category"
 *    → YES: Render subcategory listing page
 *    → NO: Check if it's a product slug
 *       → YES: Render product detail page
 *       → NO: Return notFound()
 */
export default async function HybridPage({ params, searchParams }) {
  // Await params and searchParams (Next.js 15 requirement)
  const { category, subcategory } = await params;
  const sp = await searchParams;

  // Step 1: Fetch category tree
  const tree = await getCategoryTree();
  const currentCategory = tree.find(c => c.slug === category);
  
  if (!currentCategory) {
    notFound();
  }

  // Step 2: Check if "subcategory" is a valid subcategory
  const currentSubCategory = currentCategory.subCategories?.find(s => s.slug === subcategory);

  // CASE 1: Valid Subcategory → Render Listing Page
  if (currentSubCategory) {
    const page = Number(sp?.page || 1);
    const sort = sp?.sort || 'createdAt:desc';

    const breadcrumbItems = getProductBreadcrumbs({
      category: currentCategory,
      subcategory: currentSubCategory
    });

    // Fetch products for this subcategory
    const { data, meta } = await getProductsPaginated(page, 6, sort, {
      subCategorySlug: subcategory
    });

    return (
      <main className={styles.main}>
        <div className="container">
          <Breadcrumb items={breadcrumbItems} />
          <header className={styles.header}>
            <h1 className={styles.title}>
              محصولات: {currentSubCategory.name || subcategory}
            </h1>
          </header>

          <ProductsPageClient
            initialProducts={data}
            initialMeta={meta}
            categoriesSnapshot={JSON.stringify(tree)}
            initialSort={sort}
            initialCategory={category}
            initialSubCategory={subcategory}
          />
        </div>
      </main>
    );
  }

  // CASE 2: Not a Subcategory → Check if it's a Product
  const product = await getProductBySlug(subcategory);

  if (product) {
    // Generate breadcrumbs for product detail page
    // Try to find the correct subcategory from product's categories
    let productCategory = currentCategory;
    let productSubCategory = null;

    // Find matching subcategory from product's categories array
    if (product.categories && product.categories.length > 0) {
      for (const cat of product.categories) {
        if (cat.parent) {
          // This is a subcategory
          const parentMatch = tree.find(c => c.slug === cat.parent.slug);
          if (parentMatch && parentMatch.slug === category) {
            productCategory = parentMatch;
            productSubCategory = parentMatch.subCategories?.find(s => s.slug === cat.slug);
            break;
          }
        }
      }
    }

    const breadcrumbItems = getProductBreadcrumbs({
      category: productCategory,
      subcategory: productSubCategory,
      product: product
    });

    return <ProductDetails product={product} breadcrumbItems={breadcrumbItems} />;
  }

  // CASE 3: Neither Subcategory nor Product → Not Found
  notFound();
}
