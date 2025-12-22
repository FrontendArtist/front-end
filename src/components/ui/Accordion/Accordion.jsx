'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Accordion.module.scss';
import GradientBorderCard from '../GradientBorderCard/GradientBorderCard';

/**
 * A reusable accordion component where only one item can be open at a time.
 * @param {{
 * items: Array<{id: string | number, title: string, content: string}>;
 * }} props
 */
const Accordion = ({ items }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const handleToggle = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={styles.accordion}>
      {items.map((item, index) => (
        <GradientBorderCard key={item.id} gradient={'horizontal-rtl'} >

        <div key={item.id} className={styles.accordionItem}>
          <button
            className={styles.accordionTitle}
            onClick={() => handleToggle(index)}
            aria-expanded={activeIndex === index}
          >
            <span>{item.title}</span>
            <motion.span
              className={styles.icon}
              animate={{ rotate: activeIndex === index ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {activeIndex === index && (
              <motion.div
                key="content"
                className={styles.accordionContent}
                initial="collapsed"
                animate="open"
                exit="collapsed"
                variants={{
                  open: { opacity: 1, height: 'auto' },
                  collapsed: { opacity: 0, height: 0 },
                }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                <div className={styles.contentInner}>
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </GradientBorderCard>
      ))}
    </div>
  );
};

export default Accordion;

