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
             * @param {Object} item - آیتم مورد نظر برای افزودن
             * منطق:
             * - اگر آیتم از نوع 'course' باشد، فقط یکبار اضافه می‌شود (quantity همیشه 1)
             * - اگر آیتم از نوع 'product' باشد و قبلاً موجود باشد، quantity آن +1 می‌شود
             * - اگر آیتم از نوع 'product' باشد و موجود نباشد، با quantity=1 اضافه می‌شود
             */
            addItem: (item) => {
                const currentItems = get().items;

                // بررسی اینکه آیا این آیتم قبلاً در سبد وجود دارد یا خیر
                const existingItemIndex = currentItems.findIndex(
                    (cartItem) => cartItem.id === item.id
                );

                // اگر آیتم قبلاً در سبد خرید موجود است
                if (existingItemIndex !== -1) {
                    // اگر نوع آیتم 'course' باشد، هیچ کاری انجام نمی‌دهیم
                    // چون دوره‌ها فقط یکبار قابل اضافه شدن هستند
                    if (item.type === 'course') {
                        return;
                    }

                    // اگر نوع آیتم 'product' باشد، تعداد آن را یکی افزایش می‌دهیم
                    const updatedItems = [...currentItems];
                    const existingItem = updatedItems[existingItemIndex];
                    updatedItems[existingItemIndex] = {
                        ...existingItem,
                        quantity: existingItem.quantity + 1,
                    };

                    set({ items: updatedItems });
                } else {
                    // آیتم جدید است، پس آن را به سبد اضافه می‌کنیم
                    // برای دوره‌ها quantity همیشه 1 است
                    // برای محصولات هم quantity اولیه 1 است
                    set({
                        items: [
                            ...currentItems,
                            {
                                ...item,
                                quantity: 1,
                            },
                        ],
                    });
                }
            },

            /**
             * حذف کامل یک آیتم از سبد خرید بر اساس id
             * @param {string} itemId - شناسه آیتم مورد نظر برای حذف
             */
            removeItem: (itemId) => {
                set({
                    items: get().items.filter((item) => item.id !== itemId),
                });
            },

            /**
             * به‌روزرسانی تعداد یک آیتم در سبد خرید
             * @param {string} itemId - شناسه آیتم
             * @param {number} newQuantity - تعداد جدید
             * محدودیت‌ها:
             * - این تابع فقط برای محصولات (type='product') کار می‌کند
             * - برای دوره‌ها (type='course') هیچ تغییری ایجاد نمی‌شود
             * - اگر تعداد جدید کمتر از 1 باشد، آیتم حذف می‌شود
             */
            updateQuantity: (itemId, newQuantity) => {
                const currentItems = get().items;
                const itemIndex = currentItems.findIndex((item) => item.id === itemId);

                // اگر آیتم پیدا نشد، هیچ کاری انجام نمی‌دهیم
                if (itemIndex === -1) return;

                const item = currentItems[itemIndex];

                // اگر نوع آیتم 'course' باشد، اجازه تغییر تعداد نمی‌دهیم
                // چون دوره‌ها فقط با quantity=1 مجاز هستند
                if (item.type === 'course') {
                    return;
                }

                // اگر تعداد جدید کمتر از 1 باشد، آیتم را حذف می‌کنیم
                if (newQuantity < 1) {
                    get().removeItem(itemId);
                    return;
                }

                // به‌روزرسانی تعداد آیتم
                const updatedItems = [...currentItems];
                const itemToUpdate = updatedItems[itemIndex];
                updatedItems[itemIndex] = {
                    ...itemToUpdate,
                    quantity: newQuantity,
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

