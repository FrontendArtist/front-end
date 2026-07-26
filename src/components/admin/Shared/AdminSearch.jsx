import React from 'react';
import { Search } from 'lucide-react';
import styles from './AdminShared.module.scss';

export default function AdminSearch({ value, onChange, placeholder = 'جستجو...', className = '', onSubmit }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(value);
    };

    return (
        <form className={`${styles.searchWrapper} ${className}`} onSubmit={handleSubmit}>
            <input
                type="text"
                className={styles.searchBar}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
            <button type="submit" className={styles.searchButton} aria-label="جستجو">
                <Search size={18} />
            </button>
        </form>
    );
}
