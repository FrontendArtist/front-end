🎯 Purpose

بازنویسی کامل Gridهای پروژه (Products, Courses, Articles) برای حذف fetch مستقیم در Client
و جایگزینی آن با Route Handlerهای داخلی Next.js که از API abstraction استفاده می‌کنند.

📂 File Structure
/src/app/api/products/route.js
/src/app/api/articles/route.js
/src/app/api/courses/route.js
/src/modules/products/ProductGrid/ProductGrid.jsx
/src/modules/articles/ArticleGrid/ArticleGrid.jsx
/src/modules/courses/CourseGrid/CourseGrid.jsx

⚙️ Component Type

Grid Components → use client

Route Handlers → server

🌐 Data Flow
Client (Grid.jsx)
    ↓ fetch()
Next.js Route Handler (/app/api/products/route.js)
    ↓
Domain API Module (productsApi.js)
    ↓
apiClient.js → Strapi API

🧩 Dependencies

از APIهای موجود در /lib/ استفاده می‌شود.

از query params برای pagination و sort استفاده شود:

/api/products?page=2&pageSize=6&sort=price:asc

🧠 Logic Overview

در Route Handlers:

// /app/api/products/route.js
import { getProductsPaginated } from "@/lib/productsApi";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || 1;
  const pageSize = searchParams.get("pageSize") || 6;
  const sort = searchParams.get("sort") || "createdAt:desc";
  const data = await getProductsPaginated(page, pageSize, sort);
  return Response.json(data);
}


در ProductGrid.jsx (Client):

const res = await fetch(`/api/products?page=${page}&sort=${sort}`, {
  method: "GET",
});
const data = await res.json();
setProducts(prev => [...prev, ...data]);

🧩 Pagination Support (در API Modules)

در هر API module مثل productsApi.js:

export async function getProductsPaginated(page = 1, pageSize = 6, sort = "createdAt:desc") {
  try {
    const res = await apiClient(`/products?populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}`);
    return res?.data || [];
  } catch (err) {
    console.error("خطا در واکشی محصولات صفحه‌بندی‌شده:", err);
    return [];
  }
}


همین ساختار برای articlesApi.js و coursesApi.js تکرار میشه.