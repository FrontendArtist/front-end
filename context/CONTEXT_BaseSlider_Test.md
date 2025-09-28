# Feature Context: Unit Test for BaseSlider Component

## 1. Overall Goal
To create a unit test file for the `BaseSlider` component to verify its core rendering logic using Jest and React Testing Library.

## 2. Test File
Create the following file:
- `src/components/layout/BaseSlider/BaseSlider.test.jsx`

## 3. Test Cases (`BaseSlider.test.jsx`)
The test file should cover two primary scenarios: rendering with items and rendering without items.

```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import BaseSlider from './BaseSlider';

// Mock Swiper components as we don't need to test the library itself
jest.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid="swiper-mock">{children}</div>,
  SwiperSlide: ({ children }) => <div data-testid="swiper-slide-mock">{children}</div>,
}));

jest.mock('swiper/modules', () => ({
  Navigation: (props) => null, // Mock Navigation module
}));


describe('BaseSlider Component', () => {

  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ];

  const renderItem = (item) => <div key={item.id}>{item.name}</div>;

  it('should render the correct number of slides when items are provided', () => {
    render(<BaseSlider items={mockItems} renderItem={renderItem} />);

    const slides = screen.getAllByTestId('swiper-slide-mock');
    expect(slides).toHaveLength(mockItems.length);

    // Check if the content is rendered correctly
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should render a fallback message when no items are provided', () => {
    render(<BaseSlider items={[]} renderItem={renderItem} />);
    
    expect(screen.getByText('No items to display.')).toBeInTheDocument();
  });

  it('should not render anything if items prop is null or undefined', () => {
    const { container } = render(<BaseSlider items={null} renderItem={renderItem} />);
    
    // The component should render the fallback message
    expect(screen.getByText('No items to display.')).toBeInTheDocument();
  });

});