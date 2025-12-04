Purpose

افزودن قابلیت Load More (صفحه‌بندی client-side) به تمام Gridهای پروژه (ProductGrid, ArticleGrid, CourseGrid, ServiceGrid)
بدون fetch مستقیم از Strapi — با استفاده از Route Handlers داخلی Next.js.

📂 File Structure
/src/app/api/products/route.js
/src/app/api/articles/route.js
/src/app/api/courses/route.js
/src/app/api/services/route.js
/src/modules/products/ProductGrid/ProductGrid.jsx
/src/modules/articles/ArticleGrid/ArticleGrid.jsx
/src/modules/courses/CourseGrid/CourseGrid.jsx
/src/modules/services/ServiceGrid/ServiceGrid.jsx

⚙️ Component Type

use client
(Load More دکمه و state داره → نیازمند Client Component)

🌐 Data Flow
User clicks "Load More"
   ↓
fetch(`/api/products?page=${page + 1}&pageSize=6`)
   ↓
Next.js Route Handler (/app/api/products/route.js)
   ↓
getProductsPaginated(page, pageSize) → apiClient → Strapi
   ↓
Response.json([...newItems])
   ↓
Client merges new items into existing state

🧩 Dependencies

از تابع getXPaginated() در هر lib/[x]Api.js استفاده میشه

Route Handler مربوطه باید مقدار page و pageSize رو از query string بگیره

🧠 Logic Overview
🔹 در API Module (productsApi.js)
export async function getProductsPaginated(page = 1, pageSize = 6, sort = "createdAt:desc") {
  try {
    const res = await apiClient(`/products?populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}`);
    return res?.data || [];
  } catch (err) {
    console.error("خطا در واکشی محصولات صفحه‌بندی‌شده:", err);
    return [];
  }
}

🔹 در Route Handler (/app/api/products/route.js)
import { getProductsPaginated } from "@/lib/productsApi";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || 1;
  const pageSize = searchParams.get("pageSize") || 6;
  const sort = searchParams.get("sort") || "createdAt:desc";
  const data = await getProductsPaginated(page, pageSize, sort);
  return Response.json(data);
}


(همین ساختار برای Articles, Courses, Services تکرار میشه.)

🔹 در Client Grid (مثلاً ProductGrid.jsx)
"use client";
import { useState, useEffect } from "react";
import ProductCard from "../ProductCard/ProductCard";

export default function ProductGrid({ initialProducts = [] }) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    setLoading(true);
    const res = await fetch(`/api/products?page=${page + 1}&pageSize=6`);
    const newData = await res.json();

    if (newData.length === 0) setHasMore(false);
    else {
      setProducts(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
    }

    setLoading(false);
  };

  return (
    <div className="product-grid">
      <div className="product-grid__wrapper">
        {products.map(item => <ProductCard key={item.id} {...item.attributes} />)}
      </div>

      {hasMore && (
        <button
          className="product-grid__loadmore"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? "در حال بارگذاری..." : "مشاهده بیشتر"}
        </button>
      )}
    </div>
  );
}

🎨 Design Notes

دکمه Load More از توکن‌های --color-text-primary و --color-title-hover استفاده کنه.

spacing پایین صفحه با --space-section-bottom-desktop حفظ بشه.

در موبایل، دکمه باید عرض کامل بگیره (width: 100%).

SCSS از mixin respond(md) برای واکنش‌گرایی استفاده کنه.