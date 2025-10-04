'use client';
import Link from 'next/link';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockServices } from '@/data/mock';
import styles from './ServicesSection.module.scss';

const ServicesSection = () => {
  const renderServiceCard = (service) => <ServiceCard service={service} />;

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
            items={mockServices}
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

