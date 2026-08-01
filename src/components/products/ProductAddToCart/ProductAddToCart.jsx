'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import styles from './ProductAddToCart.module.scss';

/**
 * Product AddToCart Button & Quantity Controller Component
 * Implements client-side activation for Zustand cart store with hydration safety.
 *
 * @param {{ product: Object }} props
 */
export default function ProductAddToCart({ product }) {
    if (!product) return null;

    const { id, slug, image, title, price, categories, stock, isAvailable } = product;
    const formattedPrice = (typeof price === 'object' ? price?.toman : price) || 0;

    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const addItem = useCartStore((state) => state.addItem);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItem);

    const cartItem = useCartStore((state) => state.items.find((item) => item.id === id));
    const isInCart = isHydrated && !!cartItem;
    const currentQuantity = cartItem?.quantity || 0;

    const isOutOfStock = isAvailable === false || (typeof stock === 'number' && stock <= 0);
    const isMaxStockReached = typeof stock === 'number' && currentQuantity >= stock;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isOutOfStock) return;

        let categorySlug = null;
        let subcategorySlug = null;

        if (categories && Array.isArray(categories) && categories.length > 0) {
            const subcategory = categories.find((cat) => cat.parent && cat.parent.slug);
            if (subcategory && subcategory.parent) {
                categorySlug = subcategory.parent.slug;
                subcategorySlug = subcategory.slug;
            } else {
                const rootCategory = categories.find((cat) => !cat.parent);
                if (rootCategory) {
                    categorySlug = rootCategory.slug;
                }
            }
        }

        const imageUrl = image?.url || (product.images && product.images[0]?.url) || '/images/placeholder.png';

        addItem({
            id,
            slug,
            title,
            price: formattedPrice,
            image: imageUrl,
            type: 'product',
            stock: typeof stock === 'number' ? stock : null,
            categorySlug,
            subcategorySlug,
        });
    };

    const handleIncrement = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isMaxStockReached) return;
        updateQuantity(id, currentQuantity + 1);
    };

    const handleDecrement = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentQuantity > 1) {
            updateQuantity(id, currentQuantity - 1);
        } else {
            removeItem(id);
        }
    };

    if (isOutOfStock) {
        return (
            <div className={styles.wrapper}>
                <button
                    className={`${styles.addToCartButton} card-button`}
                    disabled
                    aria-label={`${title} ناموجود است`}
                    style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#e53e3e' }}
                >
                    ناموجود
                </button>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            {!isHydrated || !isInCart ? (
                <button
                    className={`${styles.addToCartButton} card-button`}
                    onClick={handleAddToCart}
                    aria-label={`افزودن ${title} به سبد خرید`}
                >
                    افزودن به سبد خرید
                </button>
            ) : (
                <div className={styles.quantityController}>
                    <button
                        className={styles.quantityButton}
                        onClick={handleDecrement}
                        aria-label="کاهش تعداد"
                    >
                        -
                    </button>
                    <span className={styles.quantityDisplay}>{currentQuantity}</span>
                    <button
                        className={styles.quantityButton}
                        onClick={handleIncrement}
                        disabled={isMaxStockReached}
                        aria-label="افزایش تعداد"
                        style={isMaxStockReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
}
