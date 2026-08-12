import Skeleton from '@/components/ui/Skeleton/Skeleton';

/**
 * A generic unified horizontal skeleton loader for lists like cart items, comments, profile purchases.
 */
const CardSkeletonHorizontal = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        gap: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        width: '100%',
        pointerEvents: 'none'
      }}
    >
      {/* Avatar/Thumbnail */}
      <Skeleton 
        variant="rectangular" 
        width="60px" 
        height="60px" 
        style={{ borderRadius: '10px', flexShrink: 0 }} 
      />
      
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
        <Skeleton variant="text" width="60%" height="16px" />
        <Skeleton variant="text" width="40%" height="14px" />
      </div>
      
      {/* Action/Price Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0, minWidth: '80px' }}>
         <Skeleton variant="text" width="80px" height="14px" />
         <Skeleton variant="rectangular" width="40px" height="24px" style={{ borderRadius: '6px' }} />
      </div>
    </div>
  );
};

export default CardSkeletonHorizontal;
