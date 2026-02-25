'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import styles from './SearchOverlay.module.scss';
import SearchTrigger from '@/components/layout/SearchTrigger';

export default function SearchOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        // Listen for custom event to open overlay
        const handleOpen = () => {
            setIsOpen(true);
            // Focus input after transition
            setTimeout(() => inputRef.current?.focus(), 100);
        };

        window.addEventListener('open-search-overlay', handleOpen);
        return () => window.removeEventListener('open-search-overlay', handleOpen);
    }, []);

    useEffect(() => {
        // Escape key to close
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
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            setQuery(''); // Optional: clear query after search
        }
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <div
            className={clsx(styles.overlay, { [styles.open]: isOpen })}
            onClick={handleClose}
            aria-hidden={!isOpen}
        >
            <button
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="بستن جستجو"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className={styles.searchContainer} onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.input}
                        placeholder="جستجو کنید..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" className={styles.iconButton} aria-label="جستجو">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                </form>

            </div>
        </div>
    );
}
