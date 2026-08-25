import Link from 'next/link';
import styles from './Footer.module.scss';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import Image from 'next/image';
import SocialMedia from '@/modules/contact/components/SocialMedia';

const Footer = async () => {
  return (
    <footer className={styles.footer}>
      <GradientBorderCard
        gradient="horizontal-rtl"
        variant="footer"
        enableHover={false}
        className={`${styles.footerContainer} container`}
        contentClassName={styles.footerContent}
      >
        {/* یک ردیف — همه ستون‌ها کنار هم */}
        <div className={styles.footerGrid}>

          {/* درباره ما */}
          <div className={styles.footerAboutus}>
            <h3 className={styles.columnTitle}>درباره ما</h3>
            <p>
              طرح الهی بستری برای نشر آگاهی، خودشناسی و بیداری معنوی با الهام از قرآن، مثنوی و آموزه‌های مولاناست.
            </p>
          </div>

          {/* دسترسی سریع */}
          <div className={styles.footerLinks}>
            <h3 className={styles.columnTitle}>دسترسی سریع</h3>
            <ul className={styles.linkList}>
              <li><Link href="/products">محصولات</Link></li>
              <li><Link href="/articles">مقالات</Link></li>
              <li><Link href="/courses">دوره‌ها</Link></li>
              <li><Link href="/about-us">درباره ما</Link></li>
            </ul>
          </div>

          {/* شبکه‌های اجتماعی */}
          <div className={styles.footerCol}>
            <SocialMedia />
            <div className={styles.enamadBox}>
              <Image
                src="/images/namad/enamad.svg"
                alt="نماد اعتماد الکترونیکی"
                width={80}
                height={80}
                className={styles.enamadImage}
              />
              <span className={styles.enamadLabel}>در حال فعال‌سازی</span>
            </div>
          </div>

        </div>

        {/* عکس پروانه — absolute */}
        <Image
          src="/images/shamoparvane 1.png"
          alt="shamoparvane"
          width={220}
          height={480}
          className={styles.shamoparvane}
        />

        <div className={styles.footerBottom}>
          <p>تمامی حقوق برای این وب‌سایت محفوظ است. © 2025</p>
        </div>
      </GradientBorderCard>
    </footer>
  );
};

export default Footer;