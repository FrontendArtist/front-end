import ProductsSection from "@/modules/home/ProductsSection/ProductsSection";
import styles from "./page.module.css";
import HeroSection from "@/modules/home/HeroSection/HeroSection";

export default function HomePage() {
  return (
    <div className={styles.container}>
      <HeroSection />
      <ProductsSection />
    </div>
  );
}