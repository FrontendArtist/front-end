'use client';

import styles from './GradientBorderCard.module.scss';
import clsx from 'clsx';

/**
 * GradientBorderCard Component
 */
const GradientBorderCard = ({
  children,
  gradient = 'vertical', // 'vertical' | 'horizontal' | 'horizontal-rtl'
  variant = 'default',   // 'default' | 'aboutMentor' | ...
  className,
  contentClassName,
  enableHover = true,
  as: WrapperComponent = 'div',
  wrapperProps = {},
}) => {
  // gradient for content
  const gradientClass = {
    vertical: styles.gradientVertical,
    horizontal: styles.gradientHorizontal,
    'horizontal-rtl': styles.gradientHorizontalRtl,
  }[gradient];

  // gradient for border
  const borderGradientClass = {
    vertical: styles.borderVertical,
    horizontal: styles.borderHorizontal,
    'horizontal-rtl': styles.borderHorizontalRtl,
  }[gradient];

  return (
    <WrapperComponent
      {...wrapperProps}
      className={clsx(
        styles.gradientBorder,
        borderGradientClass,
        styles[variant],
        enableHover && styles.enableHover,
        className
      )}
    >
      {/* Layer 2 */}
      <div className={styles.cardBackground}>
        {/* Layer 3 */}
        <div
          className={clsx(
            styles.cardContent,
            gradientClass,
            contentClassName
          )}
        >
          {children}
        </div>
      </div>
    </WrapperComponent>
  );
};

export default GradientBorderCard;
