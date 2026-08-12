import Skeleton from '@/components/ui/Skeleton/Skeleton';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import styles from './CardSkeletonVertical.module.scss';

/**
 * A generic unified vertical card skeleton loader for products, articles, courses, etc.
 * Uses the exact same SCSS mixins as the real cards to ensure 100% height/width match without layout shifts.
 */
const CardSkeletonVertical = ({ showDescription = true }) => {
  return (
    <GradientBorderCard
      as="div"
      gradient="vertical"
      contentClassName={`${styles.cardSkeleton} card vertical-gradient`}
    >
      <div className={styles.imageWrapper}>
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          style={{ position: 'absolute', top: 0, left: 0 }} 
        />
      </div>
      <div className={styles.cardContent}>
        <Skeleton variant="text" width="85%" height="24px" style={{ marginBottom: '8px' }} />
        
        
        {/* Description lines */}
        {showDescription && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <Skeleton variant="text" width="100%" height="14px" />
            <Skeleton variant="text" width="90%" height="14px" />
          </div>
        )}

        {/* Footer/Price/Button area */}
        <div className={styles.footer}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
             <Skeleton variant="text" width="60px" height="14px" />
             <Skeleton variant="text" width="40px" height="14px" />
          </div>
          <Skeleton variant="rectangular" width="90px" height="36px" style={{ borderRadius: '8px' }} />
        </div>
      </div>
    </GradientBorderCard>
  );
};

export default CardSkeletonVertical;
