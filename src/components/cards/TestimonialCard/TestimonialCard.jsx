import Image from 'next/image';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import styles from './TestimonialCard.module.scss';

const TestimonialCard = ({ testimonial }) => {
  if (!testimonial) return null;
  const { name, title, comment, formattedDate } = testimonial;

  return (
    <GradientBorderCard
      gradient="horizontal-rtl"
      enableHover={false}
      className={styles.gradientWrapper}
    >
      <div className={styles.testimonialCard}>
        <div className={styles.header}>
          <div className={styles.authorInfo}>
            <span className={styles.author}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none"><circle cx="12" cy="8" r="4"></circle><path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6"></path></svg>
              {name}</span>
            {title && <span className={styles.title}>{title}</span>}
          </div>
          {/* <Image src="/icons/user-icon.svg" alt="User Icon" width={24} height={24} /> */}
        </div>
        <p className={styles.text}>{comment}</p>
      </div>
    </GradientBorderCard>
  );
};

export default TestimonialCard;
