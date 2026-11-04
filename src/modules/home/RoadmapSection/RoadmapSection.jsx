import Link from 'next/link';
import styles from './RoadmapSection.module.scss';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';

export default function RoadmapSection() {
  return (
    <section id="roadmap-section" className={`${styles.roadmapSection} section`}>
      <div className={`${styles.container} container`}>
        <GradientBorderCard
          gradient="horizontal-rtl"
          enableHover={true}
          className={styles.card}
        >
          <div className={styles.innerWrapper}>
            <div className={styles.decorativeGlow} aria-hidden="true" />

            <div className={styles.iconBadge} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={styles.compassIcon}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                />
              </svg>
            </div>

            <div className={styles.textContent}>
              <h2 className={styles.title}>نقشه راه گام‌به‌گام سالکان</h2>
              <p className={styles.description}>
                اگر در ابتدای مسیر هستید و می‌خواهید بدانید آموزش‌ها و مراحل سلوک را از کجا و به چه ترتیبی دنبال کنید، نقشه راه کامل طرح الهی را مشاهده نمایید.
              </p>
            </div>

            <div className={styles.actionWrapper}>
              <Link href="/roadmap" className={styles.ctaButton}>
                <span>مشاهده</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={styles.ctaArrow}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </Link>
            </div>
          </div>
        </GradientBorderCard>
      </div>
    </section>
  );
}
