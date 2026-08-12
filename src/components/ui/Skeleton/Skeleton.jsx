import styles from './Skeleton.module.scss';

/**
 * A reusable Skeleton loading component.
 * 
 * @param {Object} props
 * @param {string} [props.className] - Additional classes
 * @param {string} [props.variant='rectangular'] - The shape of the skeleton ('text' | 'circular' | 'rectangular' | 'rounded')
 * @param {number|string} [props.width] - Width of the skeleton
 * @param {number|string} [props.height] - Height of the skeleton
 * @param {Object} [props.style] - Additional inline styles
 */
const Skeleton = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) => {
  const inlineStyle = {
    width,
    height,
    ...style,
  };

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={inlineStyle}
      {...props}
    />
  );
};

export default Skeleton;
