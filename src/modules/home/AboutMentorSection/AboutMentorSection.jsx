import Image from 'next/image';
import Link from 'next/link';
import styles from './AboutMentorSection.module.scss';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';

const MENTOR_TEXT ='آموزگار طرح الهی و راهنمای معنوی سالکان راه حقیقت،ایشان پژوهشگر و مدرس حوزه قرآن، مثنوی و عرفان هستند و سال‌هاست که مسیر سلوک و بیداری معنوی را به‌صورت عمیق دنبال می‌کند. مجید سعیدیان با خرد، همدلی و بردباری با بهره‌گیری از مفاهیم قرآن و آثار مولانا، تلاش می‌کند مخاطب را از دانستن صرف به درک و آگاهی درونی برساند و راهی روشن‌تر برای شناخت حقیقت خویش،  پیش روی جویندگان قرار دهد.  ';


const AboutMentorSection = () => {
  return (
    <section id="about-mentor" className={`${styles.aboutSection} section`}>
      <div className={`${styles.container} container`}>
        <GradientBorderCard
          gradient="horizontal"
          enableHover={false}
          variant="aboutMentor"
          className={styles.card}
        >
          <div className={styles.innerWrapper}>
            {/* ===== Image — bleeds upward out of card ===== */}
            <div className={styles.imageWrapper}>
              <img 
                src="/images/master.webp"
                alt="مجید سعیدیان"
                className={styles.masterImage}
              />
            </div>

            {/* ===== Content ===== */}
            <div className={styles.contentWrapper}>
              <h2 className={styles.title}>مجید سعیدیان</h2>
              <p className={styles.text}>{MENTOR_TEXT}</p>

              <Link href="/contact-mentor" className={styles.ctaButton}>

                ارتباط با استاد
              </Link>
            </div>
          </div>
        </GradientBorderCard>
      </div>
    </section>
  );
};

export default AboutMentorSection;