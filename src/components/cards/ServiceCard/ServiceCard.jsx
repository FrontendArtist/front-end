import Image from 'next/image';
import Link from 'next/link';
import styles from './ServiceCard.module.scss';

const ServiceCard = ({ service }) => {
  if (!service) return null;
  const { slug, image, title, description } = service;

  return (
    <div className={`${styles.serviceCard} card`}>
      <div className={styles.imageWrapper}>
        <Image src={image.url} alt={image.alt || title} fill sizes="50vw" className={styles.serviceImage} />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardText}>{description}</p>
        <Link href={`/services/${slug}`} className={`${styles.ctaButton} card-button`}>
          بیشتر بدانید
        </Link>
      </div>
    </div>
  );
};

export default ServiceCard;

