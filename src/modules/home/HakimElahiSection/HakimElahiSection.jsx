import Image from 'next/image';
import Link from 'next/link';
import styles from './HakimElahiSection.module.scss';

const HakimElahiSection = () => {
  return (
    <section className={`${styles.hakimElahiSection} section`}>
      <div className={`${styles.container} container`}>
        <div className={styles.imageWrapper}>
          <Image
            src="/images/hakimelahi.png"
            alt="تصویری از حکیم الهی و یک شاگرد"
            fill
            sizes="(max-width: 768px) 480px, 360px"
            style={{ objectFit: 'cover', borderRadius: '16px' }}
          />
        </div>
        <div className={styles.contentWrapper}>
          <h2 className={styles.title}>حکیم الهی</h2>
          <p className={styles.text}>
            درمان آنها نه رفع نشانه‌های بیماری محدود می‌شود، بلکه به سرچشمه‌های مشکل توان جسم، روان و روح توجه می‌شود. طب ایرانی از دانشی پیشینیان است که با شناخت دقیق مزاج، سبک زندگی و بهره‌گیری از گیاهان دارویی و روش‌های طبیعی، بدن را به مسیر سلامتی بازمی‌گرداند.
          </p>
          <Link href="/contact-us" className={`${styles.ctaButton} card-button`}>
            ارتباط با حکیم الهی
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HakimElahiSection;

