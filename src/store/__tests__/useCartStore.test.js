import { useCartStore, selectTotalPrice, selectFinalTotalPrice, selectItemLevelDiscount } from '../useCartStore';

describe('useCartStore Noor calculations', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  test('addItem supports priceNoor directly', () => {
    useCartStore.getState().addItem({
      id: 'course-1',
      title: 'دوره تست',
      priceNoor: 150.5,
      type: 'course',
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].price).toBe(150.5);
    expect(items[0].priceNoor).toBe(150.5);
  });

  test('selectTotalPrice handles decimal addition without floating point imprecision', () => {
    useCartStore.getState().addItem({
      id: 'prod-1',
      title: 'محصول ۱',
      priceNoor: 10.1,
      type: 'product',
    });
    useCartStore.getState().addItem({
      id: 'prod-2',
      title: 'محصول ۲',
      priceNoor: 20.2,
      type: 'product',
    });

    const state = useCartStore.getState();
    const total = selectTotalPrice(state);
    expect(total).toBe(30.3);
  });

  test('selectFinalTotalPrice applies coupon discount cleanly on Noor', () => {
    useCartStore.getState().addItem({
      id: 'prod-1',
      title: 'محصول ۱',
      priceNoor: 100,
      type: 'product',
    });

    useCartStore.getState().applyCoupon({
      code: 'OFF20',
      discountAmount: 20.5,
    });

    const state = useCartStore.getState();
    const finalTotal = selectFinalTotalPrice(state);
    expect(finalTotal).toBe(79.5);
  });
});
