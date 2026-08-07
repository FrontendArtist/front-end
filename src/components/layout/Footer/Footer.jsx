import Link from 'next/link';
import styles from './Footer.module.scss';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import Image from 'next/image';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <GradientBorderCard
        gradient="horizontal-rtl"
        enableHover={false}
        className={`${styles.footerContainer} container`}
        contentClassName={styles.footerContent}
      >
        <div className={styles.footerGrid}>

          <div>
            <Image src="/images/shamoparvane 1.png" alt="logo" width={250} height={550} className={styles.shamoparvane} />
          </div>

          {/* Column 1: About/Brand */}
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>درباره ما</h3>
            <p>
              ما به دنبال ساختن یک اقتصاد رحمانی هستیم که در آن واحد ارزش نه فقط مادیات، که «نور»، آگاهی و عشق باشد.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>دسترسی سریع</h3>
            <ul className={styles.linkList}>
              <li><Link href="/products">محصولات</Link></li>
              <li><Link href="/articles">مقالات</Link></li>
              <li><Link href="/courses">دوره‌ها</Link></li>
              <li><Link href="/about-us">درباره ما</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>تماس با ما</h3>
            <ul className={styles.linkList}>
              <li>آدرس: ایران، تهران</li>
              <li>تلفن: ۰۲۱-۱۲۳۴۵۶۷۸</li>
              <li>ایمیل: info@example.com</li>
            </ul>
            {/* Social Icons Placeholder */}
            <div className={styles.socialIcons}>
              <span>Icon1</span> <span>Icon2</span> <span>Icon3</span>
            </div>
          </div>


        </div>

        <div className={styles.footerBottom}>
          <p>تمامی حقوق برای این وب‌سایت محفوظ است. © 2025</p>
        </div>
      </GradientBorderCard>
    </footer>
  );
};

export default Footer;  