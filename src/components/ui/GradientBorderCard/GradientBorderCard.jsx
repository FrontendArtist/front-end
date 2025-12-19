'use client';

import styles from './GradientBorderCard.module.scss';

/**
 * کامپوننت کارت با بوردر گرادیانتی
 * 
 * این کامپوننت از تکنیک سه‌لایه‌ای استفاده می‌کند:
 * 1. Layer 1 (gradientBorder): بوردر گرادیانتی با padding 2px
 * 2. Layer 2 (cardBackground): لایه میانی با background color
 * 3. Layer 3 (cardContent): محتوای اصلی با gradient background
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children - محتوای داخل کارت
 * @param {'vertical' | 'horizontal' | 'horizontal-rtl'} [props.gradient='vertical'] - جهت گرادیانت
 * @param {string} [props.className] - کلاس اضافی برای wrapper
 * @param {string} [props.contentClassName] - کلاس اضافی برای محتوا
 * @param {boolean} [props.enableHover=true] - فعال‌سازی افکت hover
 * @param {React.ElementType} [props.as='div'] - تگ HTML که باید رندر شود (مثلاً Link یا div)
 * @param {object} [props.wrapperProps] - props اضافی برای wrapper (مثلاً href برای Link)
 * 
 * @example
 * // استفاده ساده
 * <GradientBorderCard>
 *   <h3>عنوان</h3>
 *   <p>متن کارت</p>
 * </GradientBorderCard>
 * 
 * @example
 * // با Link و گرادیانت horizontal
 * <GradientBorderCard 
 *   as={Link} 
 *   wrapperProps={{ href: '/product/123' }}
 *   gradient="horizontal-rtl"
 * >
 *   <ProductContent />
 * </GradientBorderCard>
 */
const GradientBorderCard = ({
  children,
  gradient = 'vertical',
  className = '',
  contentClassName = '',
  enableHover = true,
  as: WrapperComponent = 'div',
  wrapperProps = {},
}) => {
  // تعیین کلاس گرادیانت بر اساس prop
  const gradientClass = gradient === 'vertical' 
    ? styles.gradientVertical 
    : gradient === 'horizontal-rtl' 
    ? styles.gradientHorizontalRtl 
    : styles.gradientHorizontal;

  // ترکیب کلاس‌ها
  const wrapperClasses = [
    styles.gradientBorder,
    enableHover ? styles.enableHover : '',
    className
  ].filter(Boolean).join(' ');

  const contentClasses = [
    styles.cardContent,
    gradientClass,
    contentClassName
  ].filter(Boolean).join(' ');

  return (
    <WrapperComponent className={wrapperClasses} {...wrapperProps}>
      {/* لایه میانی: فاصله بین بوردر و محتوا */}
      <div className={styles.cardBackground}>
        {/* محتوای اصلی */}
        <div className={contentClasses}>
          {children}
        </div>
      </div>
    </WrapperComponent>
  );
};

export default GradientBorderCard;
