# Feature Context: Refactor Accordion with Framer Motion

## 1. Goal
To refactor the existing `Accordion.jsx` component to use the `framer-motion` library for smooth open/close animations.

## 2. Component File
- `src/components/ui/Accordion/Accordion.jsx` (We will be overwriting this file)

## 3. JSX Structure (`Accordion.jsx` with Framer Motion)
```jsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Accordion.module.scss';

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
      ))}
    </div>
  );
};

export default Accordion;

4. SCSS (Accordion.module.scss)
The SCSS can now be simplified, as Framer Motion handles the height animation.

SCSS

// ... (styles for .accordion, .accordionItem, .accordionTitle)

.accordionContent {
  overflow: hidden; // This is still important
}

.contentInner {
  padding: 1rem 0;
}

// We no longer need max-height or complex transition properties here.