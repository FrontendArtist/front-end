import { getCategoryTree } from '@/lib/categoriesApi';
import { getArticleCategories } from '@/lib/articlesApi';
import NavbarClient from './NavbarClient';
import { unstable_noStore as noStore } from 'next/cache';

export const revalidate = 300;

const Navbar = async () => {
  const [productCategories, articleCategories] = await Promise.all([
    getCategoryTree(),
    getArticleCategories()
  ]);

  if ((productCategories && productCategories.error === 'BACKEND_UNAVAILABLE') ||
    (articleCategories && articleCategories.error === 'BACKEND_UNAVAILABLE')) {
    noStore();
  }

  // Snapshot کاملاً سریالایز شده برای جلوگیری از mismatch
  const categoriesSnapshot = JSON.stringify(productCategories ?? []);
  const articleCategoriesSnapshot = JSON.stringify(articleCategories ?? []);

  return (
    <NavbarClient
      categoriesSnapshot={categoriesSnapshot}
      articleCategoriesSnapshot={articleCategoriesSnapshot}
    />
  );
};

export default Navbar;
