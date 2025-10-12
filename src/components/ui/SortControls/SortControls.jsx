'use client';

import styles from './SortControls.module.scss';

/**
 * @param {{
 * options: Array<{ value: string, label: string }>;
 * currentSort: string;
 * onSortChange: (value: string) => void;
 * }} props
 */
const SortControls = ({ options, currentSort, onSortChange }) => {
  return (
    <div className={styles.sortControls}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSortChange(option.value)}
          className={currentSort === option.value ? styles.active : ''}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default SortControls;





