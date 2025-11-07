'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductGrid from '@/modules/products/ProductGrid/ProductGrid';
import CategoryFilter from './components/CategoryFilter';

export default function ProductsPageClient({
  initialProducts = [],
  initialMeta = {},
  categoriesSnapshot = '[]',
  initialSort = 'createdAt:desc',
  initialCategory = '',
  initialSubCategory = ''
}) {
  const categories = useMemo(() => {
    try { return JSON.parse(categoriesSnapshot) || []; } catch { return []; }
  }, [categoriesSnapshot]);

  const searchParams = useSearchParams();
  const router = useRouter();

  const category = searchParams.get('category') || initialCategory || '';
  const sub = searchParams.get('sub') || initialSubCategory || '';
  const sort = searchParams.get('sort') || initialSort || 'createdAt:desc';

  const handleSelectCategory = (catSlug) => {
    const params = new URLSearchParams(searchParams.toString());
    if (catSlug) {
      params.set('category', catSlug);
      params.delete('sub');
      params.set('page', '1');
    } else {
      params.delete('category');
      params.delete('sub');
      params.set('page', '1');
    }
    router.replace(`/products?${params.toString()}`, { scroll: false });
  };

  const handleSelectSub = (subSlug) => {
    const params = new URLSearchParams(searchParams.toString());
    if (subSlug) {
      params.set('sub', subSlug);
      params.set('page', '1');
    } else {
      params.delete('sub');
      params.set('page', '1');
    }
    router.replace(`/products?${params.toString()}`, { scroll: false });
  };

  const handleChangeSort = (nextSort) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', nextSort);
    params.set('page', '1');
    router.replace(`/products?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <CategoryFilter
        categories={categories}
        activeCategory={category}
        activeSubCategory={sub}
        onSelectCategory={handleSelectCategory}
        onSelectSubCategory={handleSelectSub}
      />

      <ProductGrid
        initialProducts={initialProducts}
        initialMeta={initialMeta}
        activeCategory={category}
        activeSubCategory={sub}
        sort={sort}
        onSortChange={handleChangeSort}
      />
    </>
  );
}

