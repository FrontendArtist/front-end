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
        <div className={styles.titleWrapper}>
        <img src="/images/navline.png" alt="navline" className={styles.navline} />
        <h1 className={styles.title}>طرح الهی | سفر عاشقانه از تاریکی به نور و بیداری</h1>
        </div>
        <p className={styles.subtitle}>
        </p>
        <ScrollCTAButton targetId="about-mentor">
          شروع سفر
        </ScrollCTAButton>  
      </div>
    </section>
  );
};

export default HeroSection; 