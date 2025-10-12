import Image from 'next/image';
import Link from 'next/link';
import styles from './HeroSection.module.scss';
import ScrollCTAButton from '@/components/ui/ScrollCTAButton/ScrollCTAButton';

const HeroSection = () => {
  return (
    <section className={styles.heroSection}>
      <div className={styles.backgroundImage}>
        <Image
          src="/hero/heropicshadow.webp"
          alt="Spiritual and tranquil background"
          fill
          quality={100}
          priority={true}
          style={{ objectFit: 'cover' }}
        />
        <div className={styles.overlay}></div>
      </div>
      <div className={`${styles.content} container`}>
        <h1 className={styles.title}>تبدیل معامله به تعالی</h1>
        <p className={styles.subtitle}>
          فضایی برای رشد روح، تمرین بیداری و خدمت عاشقانه
        </p>
        <ScrollCTAButton targetId="products-section">
          مشاهده محصولات
        </ScrollCTAButton>  
      </div>
    </section>
  );
};

export default HeroSection; 