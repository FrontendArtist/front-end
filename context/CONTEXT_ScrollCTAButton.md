# Feature Context: ScrollCTAButton Client Component

## 1. Overall Goal
To create a small, reusable client component that renders a button and, upon clicking, smoothly scrolls the page to a specified target element ID.

## 2. Component Files
Create the following files for this new UI component:
- `src/components/ui/ScrollCTAButton/ScrollCTAButton.jsx`

## 3. JSX Structure (`ScrollCTAButton.jsx`)
This component must be a client component. It will accept the target element's ID and the button text as props.

```jsx
'use client';

import styles from './ScrollCTAButton.module.scss';

/**
 * A client component button that smoothly scrolls to a target element.
 * @param {{
 * targetId: string;
 * children: React.ReactNode;
 * className?: string;
 * }} props
 */
const ScrollCTAButton = ({ targetId, children, className }) => {
  const handleClick = () => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <button onClick={handleClick} className={`${className || ''}`}>
      {children}
    </button>
  );
};

export default ScrollCTAButton;


Note: We will not create a dedicated .scss file. The button will receive its styles from the parent component via the className prop, making it more reusable. For example, we will pass the .card-button class to it.

