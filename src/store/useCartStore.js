import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * فروشگاه سبد خرید با استفاده از Zustand
 * این استور برای مدیریت محصولات و دوره‌های موجود در سبد خرید استفاده می‌شود
 * داده‌ها در LocalStorage ذخیره می‌شوند تا بعد از بستن مرورگر حفظ شوند
 */
export const useCartStore = create(
    persist(
        (set, get) => ({
            /**
             * آرایه آیتم‌های موجود در سبد خرید
             * هر آیتم شامل: id, slug, title, price, image, quantity, type
             */
            items: [],

            /**
             * افزودن آیتم به سبد خرید
             * @param {Object} rawItem - آیتم مورد نظر برای افزودن
             * منطق:
             * - اگر آیتم از نوع 'course' باشد، فقط یکبار اضافه می‌شود (quantity همیشه 1)
             * - اگر آیتم از نوع 'product' باشد و قبلاً موجود باشد، quantity آن +1 می‌شود
             * - اگر آیتم از نوع 'product' باشد و موجود نباشد، با quantity=1 اضافه می‌شود
             */
            addItem: (rawItem) => {
                let rawPrice = rawItem.price;
                let finalPrice = 0;
                
                if (typeof rawPrice === 'object' && rawPrice !== null) {
                    finalPrice = Number(rawPrice.toman) || 0;
                } else {
                    finalPrice = Number(rawPrice) || 0;
                }
                
                if (finalPrice <= 0 && process.env.NODE_ENV === 'development') {
                    console.warn(`⚠️ Warning: Item "${rawItem.title || rawItem.id}" was added to cart with an invalid or zero price.`, rawItem);
                }

                const item = { ...rawItem, price: finalPrice };
                const currentItems = get().items;

                const existingItemIndex = currentItems.findIndex(
                    (cartItem) => cartItem.id === item.id
                );

                if (existingItemIndex !== -1) {
                    if (item.type === 'course' || item.type === 'chapter') {
                        return;
                    }

                    const updatedItems = [...currentItems];
                    const existingItem = updatedItems[existingItemIndex];
                    const maxStock = typeof existingItem.stock === 'number' ? existingItem.stock : (typeof item.stock === 'number' ? item.stock : null);

                    if (maxStock !== null && existingItem.quantity >= maxStock) {
                        return;
                    }

                    updatedItems[existingItemIndex] = {
                        ...existingItem,
                        stock: maxStock !== null ? maxStock : existingItem.stock,
                        quantity: existingItem.quantity + 1,
                    };

                    set({ items: updatedItems });
                } else {
                    const maxStock = typeof item.stock === 'number' ? item.stock : null;
                    if (maxStock !== null && maxStock <= 0) {
                        return;
                    }

                    set({
                        items: [
                            ...currentItems,
                            {
                                ...item,
                                stock: maxStock,
                                quantity: 1,
                            },
                        ],
                    });
                }
            },

            removeItem: (itemId) => {
                set({
                    items: get().items.filter((item) => item.id !== itemId),
                });
            },

            updateQuantity: (itemId, newQuantity) => {
                const currentItems = get().items;
                const itemIndex = currentItems.findIndex((item) => item.id === itemId);

                if (itemIndex === -1) return;

                const item = currentItems[itemIndex];

                if (item.type === 'course' || item.type === 'chapter') {
                    return;
                }

                if (newQuantity < 1) {
                    get().removeItem(itemId);
                    return;
                }

                const maxStock = typeof item.stock === 'number' ? item.stock : null;
                let targetQuantity = newQuantity;

                if (maxStock !== null && targetQuantity > maxStock) {
                    targetQuantity = maxStock;
                }

                const updatedItems = [...currentItems];
                const itemToUpdate = updatedItems[itemIndex];
                updatedItems[itemIndex] = {
                    ...itemToUpdate,
                    quantity: targetQuantity,
                };

                set({ items: updatedItems });
            },

            /**
             * پاکسازی کامل سبد خرید
             * تمام آیتم‌ها (محصولات و دوره‌ها) حذف می‌شوند
             */
            clearCart: () => {
                set({ items: [] });
            },
        }),
        {
            // نام کلید ذخیره‌سازی در LocalStorage
            name: 'cart-storage',

            // نسخه استور برای مایگریشن تغییرات استیت در کاربرانی که از قبل دیتا دارند
            version: 1,
            migrate: (persistedState, version) => {
                if (version === 0) {
                    if (persistedState.items) {
                        persistedState.items = persistedState.items.map(item => {
                            let rawPrice = item.price;
                            let finalPrice = 0;
                            if (typeof rawPrice === 'object' && rawPrice !== null) {
                                finalPrice = Number(rawPrice.toman) || 0;
                            } else {
                                finalPrice = Number(rawPrice) || 0;
                            }
                            return { ...item, price: finalPrice };
                        });
                    }
                }
                return persistedState;
            },

            /**
             * تنظیمات ذخیره‌سازی
             * فقط items در LocalStorage ذخیره می‌شود
             * توابع و computed values ذخیره نمی‌شوند
             */
            partialize: (state) => ({
                items: state.items,
            }),
        }
    )
);

/**
 * سلکتورهای کمکی برای محاسبات مشتق‌شده از state
 * این توابع به صورت خودکار زمانی که items تغییر می‌کند، مقادیر جدید را محاسبه می‌کنند
 */

/**
 * محاسبه قیمت کل سبد خرید
 * @param {Object} state - state کامل استور
 * @returns {number} - مجموع قیمت تمام آیتم‌های سبد (price * quantity)
 */
export const selectTotalPrice = (state) =>
    state.items.reduce((total, item) => total + item.price * item.quantity, 0);

/**
 * محاسبه تعداد کل آیتم‌های موجود در سبد خرید
 * @param {Object} state - state کامل استور
 * @returns {number} - تعداد کل آیتم‌های یکتا (برای نمایش روی آیکون سبد خرید)
 */
export const selectItemsCount = (state) => state.items.length;

