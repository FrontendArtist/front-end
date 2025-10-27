import Image from 'next/image';
import styles from './TestimonialCard.module.scss';

const TestimonialCard = ({ testimonial }) => {
  if (!testimonial) return null;
  const { name, title, comment, formattedDate } = testimonial;

  return (
    <div className={styles.testimonialCard}>
      <div className={styles.header}>
        <div className={styles.authorInfo}>
          <span className={styles.author}>{name}</span>
          {title && <span className={styles.title}>{title}</span>}
        </div>
        <Image src="/icons/user-icon.svg" alt="User Icon" width={24} height={24} />
      </div>
      <p className={styles.text}>{comment}</p>
    </div>
  );
};

export default TestimonialCard;
