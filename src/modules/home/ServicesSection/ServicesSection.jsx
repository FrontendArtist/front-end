'use client';
import Link from 'next/link';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import styles from './ServicesSection.module.scss';

const ServicesSection = ({ data = [] }) => {
  const renderServiceCard = (service) => <ServiceCard service={service} />;

  // Show fallback message if no services available
  if (!data || data.length === 0) {
    return (
      <section className={`${styles.servicesSection} section`}>
        <div className="container">
          <header className={styles.header}>
            <h2 className={styles.title}>خدمات</h2>
            <Link href="/services" className={styles.viewAllLink}>
              مشاهده همه خدمات ...
            </Link>
          </header>
          <p style={{ textAlign: 'center', padding: '2rem' }}>در حال حاضر خدماتی وجود ندارد.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.servicesSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>خدمات</h2>
          <Link href="/services" className={styles.viewAllLink}>
            مشاهده همه خدمات ...
          </Link>
        </header>
        <div className={styles.sliderWrapper}>
          <BaseSlider
            items={data}
            renderItem={renderServiceCard}
            slidesPerView={2}
            loop={true}
          />
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

