
import Image from 'next/image';
import styles from './TestimonialCard.module.scss';

const TestimonialCard = ({ testimonial }) => {
  if (!testimonial) return null;
  const { author, text } = testimonial;

  return (
    <div className={styles.testimonialCard}>
      <div className={styles.header}>
        <span className={styles.author}>{author}</span>
        <Image src="/icons/user-icon.svg" alt="User Icon" width={24} height={24} />
      </div>
      <p className={styles.text}>{text}</p>
    </div>
  );
};

export default TestimonialCard;

