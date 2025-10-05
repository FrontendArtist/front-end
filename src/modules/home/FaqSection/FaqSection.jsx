import Accordion from '@/components/ui/Accordion/Accordion';
import { mockFaqs } from '@/data/mock';
import styles from './FaqSection.module.scss';

const FaqSection = () => {
  return (
    <section className={`${styles.faqSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>سوالات متداول</h2>
        </header>
        <div className={styles.accordionWrapper}>
          <Accordion items={mockFaqs} />
        </div>
      </div>
    </section>
  );
};

export default FaqSection;

