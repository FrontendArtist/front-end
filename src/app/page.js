import ProductsSection from "@/modules/home/ProductsSection/ProductsSection";
import styles from "./page.module.css";
import HeroSection from "@/modules/home/HeroSection/HeroSection";
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

  const res = await fetch(`${baseUrl}/api/home`, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error("Failed to fetch home data");
  }
  const { categories, faqs, testimonials, products, articles, services, courses } = await res.json();

  return (
    <div className={styles.container}>
      <HeroSection />
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