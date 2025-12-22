import Image from 'next/image';
import Link from 'next/link';
import styles from './HakimElahiSection.module.scss';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
const HakimElahiSection = () => {
  return (
    <section id="hakim-elahi" className={`${styles.aboutSection} section`}>
      <div className={`${styles.container} container`}>

        <GradientBorderCard gradient="horizontal-rtl" enableHover={false} variant="aboutMentor" >
          <div className={styles.innerWrapper} style={{ overflow: 'hidden' }}>

            <div className={styles.imageWrapper}>
              <img src="/images/hakimelahi.png" alt="hakimElahiImage" />
            </div>
            <div className={styles.contentWrapper}>
              <h2 className={styles.title}>حکیم الهی</h2>
              <p className={styles.text}>
                درمان آنها نه رفع نشانه‌های بیماری محدود می‌شود، بلکه به سرچشمه‌های مشکل توان جسم، روان و روح توجه می‌شود. طب ایرانی از دانشی پیشینیان است که با شناخت دقیق مزاج، سبک زندگی و بهره‌گیری از گیاهان دارویی و روش‌های طبیعی، بدن را به مسیر سلامتی بازمی‌گرداند.
              </p>
            </div>
          </div>
        </GradientBorderCard>
      </div>
    </section>
  );
};

export default HakimElahiSection;

