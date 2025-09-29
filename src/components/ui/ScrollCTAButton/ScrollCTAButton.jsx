'use client';

import { useCallback } from 'react';

/**
 * A client component button that smoothly scrolls to a target element.
 * @param {{
 * targetId: string;
 * children: React.ReactNode;
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

  const buttonClassName = className ? `card-button ${className}` : 'card-button';

  return (
    <button type="button" onClick={handleClick} className={buttonClassName}>
      {children}
    </button>
  );
};

export default ScrollCTAButton; 