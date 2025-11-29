import styles from "./IntroTextSection.module.scss";

export default function IntroTextSection() {
  return (
    <section className={styles.introSection}>
      <div className={styles.container}>
        <p className={styles.introText}>
          اینجا خانه‌ی عاشقان حقیقت است. <br /> مسیر بیداری، نور و آرامش را با آموزه‌های مولانا توسط استاد سعیدیان آغاز کنید.
        </p>
      </div>
    </section>
  );
}
