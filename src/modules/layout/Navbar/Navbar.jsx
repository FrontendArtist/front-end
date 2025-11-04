import { getCategoryTree } from '@/lib/categoriesApi';
import NavbarClient from './NavbarClient';

export const revalidate = 300;

const Navbar = async () => {
  const categories = await getCategoryTree();
  // Snapshot کاملاً سریالایز شده برای جلوگیری از mismatch
  const categoriesSnapshot = JSON.stringify(categories ?? []);
  return <NavbarClient categoriesSnapshot={categoriesSnapshot} />;
};

export default Navbar;
