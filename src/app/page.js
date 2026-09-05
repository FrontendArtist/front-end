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

import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const revalidate = 60;

export const metadata = {
  title: {
    absolute: `${SITE_NAME} | مرجع آموزش و محصولات معنوی`,
  },
  description: `به وب‌سایت ${SITE_NAME} خوش آمدید. مرجع آموزش و دریافت محصولات معنوی.`,
  openGraph: {
    title: `${SITE_NAME} | مرجع آموزش و محصولات معنوی`,
    description: `به وب‌سایت ${SITE_NAME} خوش آمدید. مرجع آموزش و دریافت محصولات معنوی.`,
  },
  alternates: {
    canonical: '/',
  }
};

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

  const hasBackendError = [
    categoriesResult, faqsResult, testimonialsResult, productsResult, articlesResult, servicesResult, coursesResult
  ].some(r => r.status === 'rejected');

  if (hasBackendError) {
    noStore();
  }

  const resolveData = (result) => {
    if (result.status === 'fulfilled') return result.value ?? [];
    if (process.env.NODE_ENV === 'development') {
      console.error("Backend Error in resolveData for a section:", result.reason);
    }
    return [];
  };

  const categories = resolveData(categoriesResult);
  const faqs = resolveData(faqsResult);
  const testimonials = resolveData(testimonialsResult);
  const products = resolveData(productsResult);
  const articles = resolveData(articlesResult);
  const services = resolveData(servicesResult);
  const courses = resolveData(coursesResult);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url": SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <div className={styles.container}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <IntroTextSection />
      <AboutMentorSection />
      <CoursesSection data={courses} serverError={coursesResult.status === 'rejected'} />
      {/* <HakimElahiSection /> */}
      {/* <ProductCategoriesSection data={categories} serverError={categoriesResult.status === 'rejected'} />
      <ProductsSection data={products} serverError={productsResult.status === 'rejected'} /> */}
      <ServicesSection data={services} serverError={servicesResult.status === 'rejected'} />
      <ArticlesSection data={articles} serverError={articlesResult.status === 'rejected'} />
      <FaqSection data={faqs} serverError={faqsResult.status === 'rejected'} />
      <TestimonialsSection data={testimonials} serverError={testimonialsResult.status === 'rejected'} />
    </div>
  );
}

