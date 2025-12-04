# CONTEXT_Categories.md - ProductCategoriesSection Strapi Integration

## ✅ Status: COMPLETED (2025-10-27)

## 🎯 Purpose
Integration of Product Categories with live Strapi data, replacing mock data with SSR-fetched categories from Strapi CMS.

---

## 📂 File Structure

### Modified Files:
- `/src/lib/categoriesApi.js` - Category API layer with parent filter
- `/src/lib/strapiUtils.js` - formatStrapiCategories() updated
- `/src/components/cards/CategoryCard/CategoryCard.jsx` - Handles Strapi image URLs
- `/src/modules/home/ProductCategoriesSection/ProductCategoriesSection.jsx` - Client component receiving SSR data

### Data Flow:
```
HomePage (Server Component)
  ↓
/api/home endpoint
  ↓
getAllCategories() [categoriesApi.js]
  ↓
Strapi API: /api/categories?filters[parent][$null]=true&populate[image][fields][0]=url
  ↓
formatStrapiCategories() [strapiUtils.js]
  ↓
ProductCategoriesSection (Client Component)
  ↓
CategoryCard components
```

---

## 🌐 Data Source

### Strapi Endpoint:
```
/api/categories?filters[parent][$null]=true&populate[image][fields][0]=url&populate[image][fields][1]=alternativeText
```

### Query Parameters:
- `filters[parent][$null]=true` - Fetch only main categories (no parent)
- `populate[image][fields][0]=url` - Include image URL
- `populate[image][fields][1]=alternativeText` - Include alt text

### Response Structure (Strapi v4):
```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "name": "دمنوش‌های گیاهی",
        "slug": "herbal-teas",
        "image": {
          "data": {
            "attributes": {
              "url": "/uploads/tea_icon.svg",
              "alternativeText": "Tea icon"
            }
          }
        }
      }
    }
  ]
}
```

### Formatted Output:
```js
{
  id: 1,
  slug: "herbal-teas",
  name: "دمنوش‌های گیاهی",
  icon: "http://localhost:1337/uploads/tea_icon.svg" // Full URL
}
```

---

## 🧩 Implementation Details

### 1. categoriesApi.js
```js
export async function getAllCategories() {
  // Fetches only main categories (parent=null)
  // Populates image field with url and alternativeText
  // Returns formatted array via formatStrapiCategories()
}
```

### 2. strapiUtils.js - formatStrapiCategories()
```js
- Filters items with name and slug
- Extracts item.attributes.name and item.attributes.slug
- Extracts image from attributes.image?.data?.attributes
- Uses formatSingleImage() to prefix STRAPI_API_URL
- Returns clean array with id, slug, name, icon (full URL)
```

### 3. CategoryCard.jsx
```js
- Receives category prop with {id, slug, name, icon}
- icon is already a full URL (prefixed in strapiUtils)
- Uses Next.js Image component with unoptimized flag for placeholders
- Links to /categories/{slug}
```

### 4. ProductCategoriesSection.jsx
```js
- Client component ('use client')
- Receives data prop from HomePage SSR
- Passes categories to BaseSlider
- Renders CategoryCard for each category
```

---

## ⚙️ Architecture Compliance

### ✅ Clean Architecture:
- API Layer abstraction via categoriesApi.js
- Repository Pattern implementation
- No direct fetch() calls in components
- Centralized error handling with graceful degradation

### ✅ Data Flow:
- SSR data fetching in HomePage
- Props passed to client component
- Image URLs prefixed at formatter level
- Consistent with other domain APIs

### ✅ Code Quality:
- Comprehensive documentation comments
- Error handling returns empty array
- Type safety via JSDoc
- No mock data dependencies

---

## 🎨 Styling Notes
- CategoryCard uses SCSS Modules
- Icon wrapper with 64x64 image size
- Responsive slider with 6 slides per view
- RTL support maintained
- Dark theme with gold accents

---

## 🧪 Testing Checklist
- [x] API fetches only parent=null categories
- [x] Image URLs properly prefixed
- [x] Empty state handled gracefully
- [x] Slider renders with correct slides
- [x] Links navigate to /categories/{slug}
- [x] No linter errors
- [x] SSR working properly

---

## 📝 Notes
- Mock data (mockCategories) remains in mock.js but is NOT imported
- All category data now comes from Strapi
- Categories are cached via Next.js revalidate: 300
- Fallback placeholder images handled via formatSingleImage()
- Architecture matches Products, Articles, Courses, Services patterns
