'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SearchBox.module.scss';
import clsx from 'clsx';

export default function SearchBox({ initialQuery = '', initialType = 'all', className }) {
    const [query, setQuery] = useState(initialQuery);
    const [type, setType] = useState(initialType);
    const router = useRouter();

    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    useEffect(() => {
        setType(initialType);
    }, [initialType]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            const typeParam = type !== 'all' ? `&type=${encodeURIComponent(type)}` : '';
            router.push(`/search?q=${encodeURIComponent(query.trim())}${typeParam}`);
        }
    };

    const handleClear = () => {
        setQuery('');
    };

    return (
        <form className={clsx(styles.searchBox, className)} onSubmit={handleSearch}>
            <div className={styles.selectContainer}>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={styles.typeSelect}
                    aria-label="انتخاب دسته‌بندی"
                >
                    <option value="all">همه دسته‌ها</option>
                    <option value="محصولات">محصولات</option>
                    <option value="مقالات">مقالات</option>
                    <option value="دوره‌ها">دوره‌ها</option>
                </select>
            </div>

            <div className={styles.inputContainer}>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="جستجو در محصولات، مقالات و دوره‌ها..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className={styles.clearButton}
                        aria-label="پاک‌کردن متن"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <button type="submit" className={styles.submitButton} aria-label="جستجو">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>جستجو</span>
            </button>
        </form>
    );
}


