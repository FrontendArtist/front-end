import Image from 'next/image';
import Link from 'next/link';
import styles from './AboutMentorSection.module.scss';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
const AboutMentorSection = () => {
  return (
    <section id="about-mentor" className={`${styles.aboutSection} section`}>
      <div className={`${styles.container} container`}>

        <GradientBorderCard gradient="horizontal" enableHover={false} variant="aboutMentor" >
          <div style={{ display: 'flex' }}>

            <div className={styles.contentWrapper}>
              <h2 className={styles.title}>مجید سعیدیان</h2>
              <p className={styles.text}>
                آموزگار طرح الهی و راهنمای معنوی شما در مسیر روح که با استفاده از اشعار مولانا و تفسیر و تاویل آنها و همچنین با استفاده از کتاب قرآن هدایت گر ، شمارا در مسیر الهیتان هدایت و راهنمایی میکند .مجید سعیدیان با خرد ، همدلی ، شفقت ، مهربانی  و صبر و  بردباری همراه شما است شما نیز میتوانید از آموزه های ایشان های که در غالب دوره های صوتی در آمده استفاده کرده و مسیر سلوک خود را در پیش بگیرید .برای دسترسی به دوره های آموزشی به بخش دوره ها در سایت رجوع کنید .
              </p>
            </div>
            <div className={styles.imageWrapper}>
              <img src="/images/master.png" alt="masterImage" />
            </div>
          </div>
        </GradientBorderCard>
      </div>
    </section>
  );
};

export default AboutMentorSection;