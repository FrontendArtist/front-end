import React from 'react';
import { Search, X } from 'lucide-react';
import styles from './AdminShared.module.scss';

export default function AdminSearch({ value, onChange, onClear, placeholder = 'جستجو...', className = '', onSubmit }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(value);
    };

    const handleClear = () => {
        if (onClear) {
            onClear();
        } else if (onChange) {
            onChange({ target: { value: '' } });
        }
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
            {value ? (
                <button
                    type="button"
                    className={styles.searchButton}
                    onClick={handleClear}
                    aria-label="پاک‌کردن جستجو"
                    title="پاک‌کردن جستجو"
                >
                    <X size={18} />
                </button>
            ) : (
                <button type="submit" className={styles.searchButton} aria-label="جستجو">
                    <Search size={18} />
                </button>
            )}
        </form>
    );
}
