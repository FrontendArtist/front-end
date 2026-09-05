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

                const rawImg = rawItem.image;
                let imageUrl = '/images/forempties2.png';
                if (typeof rawImg === 'string' && rawImg.trim() !== '') {
                    imageUrl = rawImg.trim();
                } else if (rawImg && typeof rawImg === 'object' && rawImg.url) {
                    imageUrl = rawImg.url;
                }

                const item = { ...rawItem, price: finalPrice, image: imageUrl };
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
             * اطلاعات کوپن تخفیف اعمال شده
             * { code, title, discountType, discountValue, discountAmount, originalTotalPrice, finalTotalPrice }
             */
            appliedCoupon: null,

            /**
             * اعمال کوپن تخفیف در سبد خرید
             */
            applyCoupon: (couponData) => {
                set({ appliedCoupon: couponData });
            },

            /**
             * حذف کوپن تخفیف
             */
            removeCoupon: () => {
                set({ appliedCoupon: null });
            },

            /**
             * شناسه کاربری مرتبط با این سبد خرید جهت جلوگیری از Session Fixation
             */
            userId: null,

            /**
              * تنظیم شناسه کاربری و پاکسازی خودکار در صورت تغییر کاربر
              */
            setCartUser: (newUserId) => {
                const currentUserId = get().userId;
                if (currentUserId && newUserId && String(currentUserId) !== String(newUserId)) {
                    set({ items: [], appliedCoupon: null, userId: newUserId });
                } else {
                    set({ userId: newUserId });
                }
            },

            /**
             * پاکسازی کامل سبد خرید
             * تمام آیتم‌ها (محصولات و دوره‌ها) و کوپن تخفیف حذف می‌شوند
             */
            clearCart: () => {
                set({ items: [], appliedCoupon: null, userId: null });
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
             * items, appliedCoupon و userId در LocalStorage ذخیره می‌شوند
             */
            partialize: (state) => ({
                items: state.items,
                appliedCoupon: state.appliedCoupon,
                userId: state.userId,
            }),
        }
    )
);

/**
 * سلکتورهای کمکی برای محاسبات مشتق‌شده از state
 * این توابع به صورت خودکار زمانی که items یا appliedCoupon تغییر می‌کند، مقادیر جدید را محاسبه می‌کنند
 */

/**
 * محاسبه قیمت ناخالص کل سبد خرید (بدون احتساب کد تخفیف)
 * @param {Object} state - state کامل استور
 * @returns {number} - مجموع قیمت تمام آیتم‌های سبد (price * quantity)
 */
export const selectTotalPrice = (state) =>
    (state.items || []).reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

/**
 * محاسبه مجموع تخفیف‌های مستقیم اعمال‌شده روی تک‌تک آیتم‌ها (تفاوت originalPrice و price)
 */
export const selectItemLevelDiscount = (state) =>
    (state.items || []).reduce((sum, item) => {
        const orig = Number(item.originalPrice) || 0;
        const current = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        return sum + (orig > current ? (orig - current) * qty : 0);
    }, 0);

/**
 * محاسبه مبلغ تخفیف کد تخفیف
 */
export const selectCouponDiscount = (state) =>
    Number(state.appliedCoupon?.discountAmount) || 0;

/**
 * محاسبه مبلغ نهایی قابل پرداخت (پس از کسر تخفیف کوپن)
 */
export const selectFinalTotalPrice = (state) => {
    const rawTotal = selectTotalPrice(state);
    const couponDiscount = selectCouponDiscount(state);
    return Math.max(0, rawTotal - couponDiscount);
};

/**
 * محاسبه تعداد کل آیتم‌های موجود در سبد خرید
 * @param {Object} state - state کامل استور
 * @returns {number} - تعداد کل آیتم‌های یکتا (برای نمایش روی آیکون سبد خرید)
 */
export const selectItemsCount = (state) => (state.items || []).length;


