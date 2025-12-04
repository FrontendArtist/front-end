🎯 Purpose

ایجاد و یکپارچه‌سازی ماژول‌های داده‌ای پروژه برای دامنه‌های:
Products, Articles, Courses
هر کدام از این ماژول‌ها باید یک API Wrapper باشند که تمام ارتباطات با Strapi را از طریق apiClient.js انجام دهند.

📂 File Structure
/src/lib/apiClient.js
/src/lib/productsApi.js
/src/lib/articlesApi.js
/src/lib/coursesApi.js

⚙️ Module Type

server
(فقط در محیط SSR اجرا می‌شود؛ بدون استفاده در کلاینت)

🌐 Data Source

هر دامنه از endpoint اختصاصی خود در Strapi داده دریافت می‌کند:

دامنه	Endpoint	توابع لازم
Products	/api/products?populate=*	getAllProducts() / getProductBySlug(slug)
Articles	/api/articles?populate=*	getAllArticles() / getArticleBySlug(slug)
Courses	/api/courses?populate=*	getAllCourses() / getCourseBySlug(slug)
🧩 Dependencies

apiClient.js برای ارسال درخواست‌ها

ساختار پاسخ Strapi: { data, meta }

متغیر محیطی NEXT_PUBLIC_STRAPI_API_URL

🧠 Logic Overview

هر فایل (productsApi.js, articlesApi.js, coursesApi.js) باید شامل دو تابع باشد:

export async function getAllX() {
  try {
    const res = await apiClient("/X?populate=*");
    return res?.data || [];
  } catch (err) {
    console.error("Error fetching X:", err);
    return [];
  }
}

export async function getXBySlug(slug) {
  try {
    const res = await apiClient(`/X/${slug}?populate=*`);
    return res?.data || null;
  } catch (err) {
    console.error("Error fetching X by slug:", err);
    return null;
  }
}


در اینجا X به ترتیب یکی از موارد products, articles, courses است.

🎨 Design Notes

بدون UI، فقط منطق داده

تابع‌ها باید async و با try/catch باشند

در صورت خطا، خروجی ایمن (null یا []) بدهند

حاوی کامنت‌های فارسی واضح برای درک منطق

🧩 نمونه ساختار فایل‌ها

📦 /src/lib/productsApi.js

import { apiClient } from "./apiClient";

/**
 * واکشی تمام محصولات از Strapi
 */
export async function getAllProducts() {
  try {
    const res = await apiClient("/products?populate=*");
    return res?.data || [];
  } catch (err) {
    console.error("خطا در واکشی محصولات:", err);
    return [];
  }
}

/**
 * واکشی محصول خاص بر اساس slug
 */
export async function getProductBySlug(slug) {
  try {
    const res = await apiClient(`/products/${slug}?populate=*`);
    return res?.data || null;
  } catch (err) {
    console.error("خطا در واکشی محصول تکی:", err);
    return null;
  }
}


(همین ساختار برای articlesApi.js و coursesApi.js هم تکرار می‌شود.)




