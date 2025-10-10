# Feature Context: Reusable SortControls Component

## 1. Goal
To create a generic, reusable client component for displaying sorting options as buttons.

## 2. Files
- `src/components/ui/SortControls/SortControls.jsx`
- `src/components/ui/SortControls/SortControls.module.scss`

## 3. JSX (`SortControls.jsx`)
This component receives the sort options, the current active sort, and a callback function.
```jsx
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
4. SCSS (SortControls.module.scss)
SCSS

.sortControls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  button {
    padding: 0.5rem 1rem;
    cursor: pointer;
    border: 1px solid var(--color-text-primary);
    background-color: transparent;
    color: var(--color-text-primary);
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &:hover {
      background-color: var(--color-text-primary);
      color: var(--color-bg-primary);
    }

    // Style for the active button
    &.active {
      background-color: var(--color-text-primary);
      color: var(--color-bg-primary);
      cursor: default;
    }
  }
}
