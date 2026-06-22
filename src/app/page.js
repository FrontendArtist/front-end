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
import ServerErrorBlock from "@/components/ui/ServerErrorBlock/ServerErrorBlock";
import { unstable_noStore as noStore } from "next/cache";

import { getMainCategories } from '@/lib/categoriesApi';
import { getAllFaqs } from '@/lib/faqApi';
import { getAllTestimonials } from '@/lib/testimonialsApi';
import { getProducts } from '@/lib/productsApi';
import { getArticles } from '@/lib/articlesApi';
import { getServices } from '@/lib/servicesApi';
import { getCourses } from '@/lib/coursesApi';

export const revalidate = 60;

export default async function HomePage() {
  // هر درخواست به صورت مستقل انجام می‌شود تا در صورت قطعی سرور،
  // خطای یک بخش باعث از دست رفتن داده‌های بقیه نشود.
  const [
    categoriesResult,
    faqsResult,
    testimonialsResult,
    productsResult,
    articlesResult,
    servicesResult,
    coursesResult,
  ] = await Promise.allSettled([
    getMainCategories(),
    getAllFaqs(),
    getAllTestimonials(),
    getProducts({ limit: 20 }),
    getArticles({ limit: 20 }),
    getServices({ limit: 20 }),
    getCourses({ limit: 20 }),
  ]);

  const resolveData = (result) => {
    if (result.status === 'fulfilled') return result.value ?? [];
    // اگر Promise کاملاً reject شد (خطای غیرمنتظره)، آرایه خالی برمی‌گردانیم
    const fallback = [];
    fallback.error = 'BACKEND_UNAVAILABLE';
    return fallback;
  };

  const categories = resolveData(categoriesResult);
  const faqs = resolveData(faqsResult);
  const testimonials = resolveData(testimonialsResult);
  const products = resolveData(productsResult);
  const articles = resolveData(articlesResult);
  const services = resolveData(servicesResult);
  const courses = resolveData(coursesResult);

  const hasBackendError = [
    categories, faqs, testimonials, products, articles, services, courses
  ].some(arr => arr && arr.error === 'BACKEND_UNAVAILABLE');

  if (hasBackendError) {
    noStore();
  }

  return (
    <div className={styles.container}>
      <HeroSection />
      <IntroTextSection />
      <AboutMentorSection />
      <CoursesSection data={courses} serverError={courses?.error === 'BACKEND_UNAVAILABLE'} />
      <HakimElahiSection />
      <ProductCategoriesSection data={categories} serverError={categories?.error === 'BACKEND_UNAVAILABLE'} />
      <ProductsSection data={products} serverError={products?.error === 'BACKEND_UNAVAILABLE'} />
      <ServicesSection data={services} serverError={services?.error === 'BACKEND_UNAVAILABLE'} />
      <ArticlesSection data={articles} serverError={articles?.error === 'BACKEND_UNAVAILABLE'} />
      <FaqSection data={faqs} serverError={faqs?.error === 'BACKEND_UNAVAILABLE'} />
      <TestimonialsSection data={testimonials} serverError={testimonials?.error === 'BACKEND_UNAVAILABLE'} />
    </div>
  );
}

