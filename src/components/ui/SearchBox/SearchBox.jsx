'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SearchBox.module.scss';
import clsx from 'clsx';

export default function SearchBox({ initialQuery = '', className }) {
    const [query, setQuery] = useState(initialQuery);
    const [type, setType] = useState('all');
    const router = useRouter();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            const typeParam = type !== 'all' ? `&type=${type}` : '';
            router.push(`/search?q=${encodeURIComponent(query.trim())}${typeParam}`);
        }
    };

    return (
        <form className={clsx(styles.searchBox, className)} onSubmit={handleSearch}>
            <div className={styles.selectContainer}>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={styles.typeSelect}
                >
                    <option value="all">همه</option>
                    <option value="محصولات">محصولات</option>
                    <option value="مقالات">مقالات</option>
                    <option value="دوره‌ها">دوره‌ها</option>
                </select>
            </div>
            <input
                type="text"
                className={styles.input}
                placeholder="جستجو..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className={styles.iconButton} aria-label="جستجو">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>
        </form>
    );
}
