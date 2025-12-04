🎯 Purpose

صفحه لیست خدمات در مسیر /services
نمایش تمام خدمات با استفاده از داده‌های Strapi از طریق servicesApi.js (بدون fetch مستقیم در صفحه).

📂 File Structure
/src/modules/services/page.jsx
/src/modules/services/ServicePage.module.scss
/src/lib/servicesApi.js

⚙️ Component Type

server
(صفحه فقط داده را از API abstraction می‌گیرد و SSR انجام می‌دهد.)

🌐 Data Source

Endpoint: /api/services

Wrapper Function: getAllServices() از servicesApi.js

Fields used: id, slug, image, title, description, link

🧩 Dependencies

ServiceGrid

Breadcrumbs

EmptyState

servicesApi.js (برای فچ داده‌ها از Strapi از طریق apiClient.js)

🧠 State Logic

ندارد (Server Component)
اما:

بررسی خطا یا داده خالی (if (!services?.length) → نمایش EmptyState)

🎨 Design Notes

مطابق نسخه قبلی:

Hero section با عنوان و توضیح

استفاده از spacing و رنگ‌ها از styles.md

نمایش ServiceGrid در پایین بخش Hero

📦 API Layer Details

/src/lib/servicesApi.js

import { apiClient } from "./apiClient";

export async function getAllServices() {
  try {
    const response = await apiClient("/services?populate=*");
    return response.data || [];
  } catch (err) {
    console.error("Error fetching services:", err);
    return [];
  }
}


/src/lib/apiClient.js

export async function apiClient(endpoint, options = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
