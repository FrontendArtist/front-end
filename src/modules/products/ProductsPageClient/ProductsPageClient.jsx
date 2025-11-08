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

  // Category and subcategory now come from path params (SSR-provided)
  const category = initialCategory || '';
  const sub = initialSubCategory || '';
  const sort = searchParams.get('sort') || initialSort || 'createdAt:desc';

  const handleSelectCategory = (catSlug) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    const basePath = catSlug ? `/products/${catSlug}` : `/products`;
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  };

  const handleSelectSub = (subSlug) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    const basePath = subSlug ? `/products/${category}/${subSlug}` : `/products/${category}`;
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  };

  const handleChangeSort = (nextSort) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', nextSort);
    params.set('page', '1');
    const basePath = category
      ? `/products/${category}${sub ? `/${sub}` : ''}`
      : `/products`;
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
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

