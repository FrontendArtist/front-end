import ProductsSection from "@/modules/home/ProductsSection/ProductsSection";
import styles from "./page.module.css";
export default function HomePage() {
  return (
    <div className={styles.container}>
      <ProductsSection />
    </div>
  );
}