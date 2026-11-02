// هویت قلم سبد = نوع + شناسه؛ دوره و کالای هم‌شماره دو قلم جدا هستند.
// قلم‌های قدیمی ذخیره‌شده بدون type همان کالا (product) محسوب می‌شوند.
export const DEFAULT_CART_ITEM_TYPE = 'product';

export const cartItemType = (item) => item?.type || DEFAULT_CART_ITEM_TYPE;

export const isSameCartKey = (item, id, type) =>
    item?.id === id && cartItemType(item) === (type || DEFAULT_CART_ITEM_TYPE);

export const cartItemKey = (item) => `${cartItemType(item)}:${item.id}`;
