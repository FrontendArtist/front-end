import ProductsSection from "@/modules/home/ProductsSection/ProductsSection";
import styles from "./page.module.css";
import HeroSection from "@/modules/home/HeroSection/HeroSection";
import IntroTextSection from "@/modules/home/IntroTextSection/IntroTextSection";
import AboutMentorSection from "@/modules/home/AboutMentorSection/AboutMentorSection";
import CoursesSection from "@/modules/home/CoursesSection/CoursesSection";
import HakimElahiSection from "@/modules/home/HakimElahiSection/HakimElahiSection";
import ProductCategoriesSection from "@/modules/home/ProductCategoriesSection/ProductCategoriesSection";
import ServicesSection from "@/modules/home/ServicesSection/ServicesSection";
import ArticlesSection from "@/modules/home/ArticlesSection/ArticlesSection";
import FaqSection from "@/modules/home/FaqSection/FaqSection";
import TestimonialsSection from "@/modules/home/TestimonialsSection/TestimonialsSection";
import { headers } from "next/headers";

export const revalidate = 300;

export default async function HomePage() {
  const hdrs = await headers();
  const protocol = hdrs.get("x-forwarded-proto") || "http";
  const host = hdrs.get("host");
  const baseUrl = `${protocol}://${host}`;

  let homeData = null;
  try {
    const res = await fetch(`${baseUrl}/api/home`, { next: { revalidate: 300 } });
    if (res.ok) {
      homeData = await res.json();
    } else {
      console.warn(`⚠️ /api/home responded with status ${res.status}`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to fetch home data (Strapi may be offline):", err.message);
  }

  if (!homeData) {
    return (
      <div className={styles.container} style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "4rem 1rem", textAlign: "center" }}>
        <HeroSection />
        <div style={{ marginTop: "2rem" }}>
          <p style={{ fontSize: "1.25rem", color: "var(--color-text-muted, #888)" }}>🔌 سرور در دسترس نیست</p>
          <p style={{ fontSize: "0.95rem", color: "var(--color-text-muted, #aaa)", marginTop: "0.5rem" }}>لطفاً چند لحظه دیگر مجدداً تلاش کنید.</p>
        </div>
      </div>
    );
  }

  const { categories, faqs, testimonials, products, articles, services, courses } = homeData;

  return (
    <div className={styles.container}>
      <HeroSection />
      <IntroTextSection />
      <AboutMentorSection />
      <CoursesSection data={courses} />
      <HakimElahiSection />
      <ProductCategoriesSection data={categories} />
      <ProductsSection data={products} />
      <ServicesSection data={services} />
      <ArticlesSection data={articles} />
      <FaqSection data={faqs} />
      <TestimonialsSection data={testimonials} />
    </div>
  );
}
