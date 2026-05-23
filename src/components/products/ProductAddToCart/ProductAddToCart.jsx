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

    const { id, slug, image, title, price, categories } = product;
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

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();

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
            categorySlug,
            subcategorySlug,
        });
    };

    const handleIncrement = (e) => {
        e.preventDefault();
        e.stopPropagation();
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
                        aria-label="افزایش تعداد"
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
}
