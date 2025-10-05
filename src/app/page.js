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


export default function HomePage() {
  return (
    <div className={styles.container}>
      <HeroSection />
      <AboutMentorSection />
      <CoursesSection />
      <HakimElahiSection />
      <ProductCategoriesSection />
      <ProductsSection />
      <ServicesSection />
      <ArticlesSection />
      <FaqSection />
    </div>
  );
}