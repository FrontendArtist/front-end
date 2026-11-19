'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import styles from './SearchOverlay.module.scss';

export default function SearchOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const inputRef = useRef(null);
    const router = useRouter();

    const quickTags = [
        { label: 'همه دسته‌ها', type: 'all' },
        { label: 'محصولات', type: 'محصولات' },
        { label: 'مقالات', type: 'مقالات' },
        { label: 'دوره‌ها', type: 'دوره‌ها' },
    ];

    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 150);
        };

        window.addEventListener('open-search-overlay', handleOpen);
        return () => window.removeEventListener('open-search-overlay', handleOpen);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            setIsOpen(false);
            const typeParam = selectedType !== 'all' ? `&type=${encodeURIComponent(selectedType)}` : '';
            router.push(`/search?q=${encodeURIComponent(query.trim())}${typeParam}`);
            setQuery('');
            setSelectedType('all');
        }
    };

    const handleTagSelect = (tagType) => {
        setSelectedType(tagType);
        // If query is already entered, execute search directly in selected category
        if (query.trim()) {
            setIsOpen(false);
            const typeParam = tagType !== 'all' ? `&type=${encodeURIComponent(tagType)}` : '';
            router.push(`/search?q=${encodeURIComponent(query.trim())}${typeParam}`);
            setQuery('');
            setSelectedType('all');
        } else {
            // Focus input so user can type
            inputRef.current?.focus();
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setSelectedType('all');
    };

    return (
        <div
            className={clsx(styles.overlay, { [styles.open]: isOpen })}
            onClick={handleClose}
            aria-hidden={!isOpen}
        >
            {/* ESC Badge & Close Button */}
            <div className={styles.topActions} onClick={(e) => e.stopPropagation()}>
                <span className={styles.escBadge}>
                    <kbd>ESC</kbd> برای بستن
                </span>
                <button
                    className={styles.closeButton}
                    onClick={handleClose}
                    aria-label="بستن جستجو"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>جستجو در طرح الهی</h3>
                    <p className={styles.modalSubtitle}>
                        {selectedType !== 'all' ? `جستجو اختصاصی در بخش «${selectedType}»` : 'عبارت مورد نظر خود را وارد کنید'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputWrapper}>
                        <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.input}
                            placeholder={selectedType !== 'all' ? `جستجو در ${selectedType}...` : 'جستجو کنید...'}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                            <button
                                type="button"
                                className={styles.clearBtn}
                                onClick={() => setQuery('')}
                                aria-label="پاک کردن"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button type="submit" className={styles.submitBtn}>
                        جستجو
                    </button>
                </form>

                <div className={styles.quickTagsContainer}>
                    <span className={styles.quickTagsLabel}>محدود کردن به دسته‌بندی:</span>
                    <div className={styles.quickTags}>
                        {quickTags.map((tag) => (
                            <button
                                key={tag.type}
                                type="button"
                                className={clsx(styles.tagChip, { [styles.activeTag]: selectedType === tag.type })}
                                onClick={() => handleTagSelect(tag.type)}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}


