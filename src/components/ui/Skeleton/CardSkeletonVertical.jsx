import Skeleton from '@/components/ui/Skeleton/Skeleton';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';

/**
 * A generic unified vertical card skeleton loader for products, articles, courses, etc.
 */
const CardSkeletonVertical = () => {
  return (
    <GradientBorderCard
      as="div"
      gradient="vertical"
      contentClassName="card vertical-gradient"
      style={{ 
        pointerEvents: 'none', 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        padding: '0' // Removing padding so image goes edge to edge
      }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', flexShrink: 0 }}>
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          style={{ position: 'absolute', top: 0, left: 0 }} 
        />
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '16px' }}>
        <Skeleton variant="text" width="85%" height="24px" style={{ marginBottom: '8px' }} />
        
        {/* Description lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <Skeleton variant="text" width="100%" height="14px" />
          <Skeleton variant="text" width="90%" height="14px" />
        </div>

        {/* Footer/Price/Button area */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '12px' }}>
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
