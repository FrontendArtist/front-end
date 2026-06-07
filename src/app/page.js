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

import { getMainCategories } from '@/lib/categoriesApi';
import { getAllFaqs } from '@/lib/faqApi';
import { getAllTestimonials } from '@/lib/testimonialsApi';
import { getProducts } from '@/lib/productsApi';
import { getArticles } from '@/lib/articlesApi';
import { getServices } from '@/lib/servicesApi';
import { getCourses } from '@/lib/coursesApi';

export const revalidate = 60;

export default async function HomePage() {
  let categories = [];
  let faqs = [];
  let testimonials = [];
  let products = [];
  let articles = [];
  let services = [];
  let courses = [];

  try {
    const [
      fetchedCategories,
      fetchedFaqs,
      fetchedTestimonials,
      fetchedProducts,
      fetchedArticles,
      fetchedServices,
      fetchedCourses
    ] = await Promise.all([
      getMainCategories(),
      getAllFaqs(),
      getAllTestimonials(),
      getProducts({ limit: 20 }),
      getArticles({ limit: 20 }),
      getServices({ limit: 20 }),
      getCourses({ limit: 20 }),
    ]);

    categories = fetchedCategories || [];
    faqs = fetchedFaqs || [];
    testimonials = fetchedTestimonials || [];
    products = fetchedProducts || [];
    articles = fetchedArticles || [];
    services = fetchedServices || [];
    courses = fetchedCourses || [];
  } catch (err) {
    console.warn("⚠️ Failed to fetch home data (Strapi may be offline):", err.message);
  }

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

