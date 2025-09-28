'use client';

import styles from './ProductCard.module.scss';

const AddToCartButton = () => {
  return (
    <button 
      className={`${styles.ctaButton} card-button`} 
      onClick={(e) => e.preventDefault()}
    >
      افزودن به سبد
    </button>
  );
};

export default AddToCartButton; 