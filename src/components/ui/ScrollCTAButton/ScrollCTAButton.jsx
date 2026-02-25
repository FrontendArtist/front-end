'use client';

import { useCallback, useMemo } from 'react';
import styles from './ScrollCTAButton.module.scss';

/**
 * A client component button that smoothly scrolls to a target element.
 * @param {{
 * targetId: string;
 * children?: React.ReactNode;
 * className?: string;
 * }} props
 */
const ScrollCTAButton = ({ targetId, children, className }) => {
  const handleClick = useCallback(() => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [targetId]);

  const label = useMemo(() => {
    if (typeof children === 'string' && children.trim().length > 0) {
      return children;
    }

    return children || 'مشاهده محصولات';
  }, [children]);

  const buttonClassName = className
    ? `${styles.heroButton} ${className}`
    : styles.heroButton;

  return (
    <button type="button" onClick={handleClick} className={buttonClassName}>
      <span className={styles.heroButtonLabel}>{label}</span>
    </button>
  );
};

export default ScrollCTAButton;