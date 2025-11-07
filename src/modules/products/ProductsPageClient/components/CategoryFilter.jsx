'use client';

/**
 * Minimal CategoryFilter: renders category buttons and subcategory buttons for active category.
 * Expected props:
 * - categories: Array<{ slug: string, title: string, subCategories?: Array<{ slug: string, title: string }> }>
 * - activeCategory: string
 * - activeSubCategory: string
 * - onSelectCategory: (slug: string | undefined) => void
 * - onSelectSubCategory: (slug: string | undefined) => void
 */
export default function CategoryFilter({
  categories = [],
  activeCategory = '',
  activeSubCategory = '',
  onSelectCategory,
  onSelectSubCategory
}) {
  const activeCatObj = categories.find(c => c.slug === activeCategory);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button
          onClick={() => onSelectCategory?.(undefined)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #244',
            background: activeCategory ? 'transparent' : '#0b2',
            color: '#FFFAEA'
          }}
        >
          همه دسته‌ها
        </button>
        {categories.map(cat => (
          <button
            key={cat.slug}
            onClick={() => onSelectCategory?.(cat.slug)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #244',
              background: activeCategory === cat.slug ? '#0b2' : 'transparent',
              color: '#FFFAEA'
            }}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {activeCatObj?.subCategories?.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onSelectSubCategory?.(undefined)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #244',
              background: activeSubCategory ? 'transparent' : '#062',
              color: '#FFFAEA'
            }}
          >
            همه زیردسته‌ها
          </button>
          {activeCatObj.subCategories.map(sc => (
            <button
              key={sc.slug}
              onClick={() => onSelectSubCategory?.(sc.slug)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #244',
                background: activeSubCategory === sc.slug ? '#062' : 'transparent',
                color: '#FFFAEA'
              }}
            >
              {sc.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

