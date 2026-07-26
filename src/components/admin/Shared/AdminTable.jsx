import React from 'react';
import styles from './AdminShared.module.scss';

export function AdminTableContainer({ children }) {
    return <div className={styles.tableContainer}>{children}</div>;
}

export function AdminToolbar({ children }) {
    return <div className={styles.toolbar}>{children}</div>;
}

export function AdminTable({ headers, children }) {
    return (
        <table className={styles.table}>
            <thead>
                <tr>
                    {headers.map((header, index) => (
                        <th key={index}>{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {children}
            </tbody>
        </table>
    );
}

export function AdminPagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className={styles.pagination}>
            <button
                className={styles.pagination__btn}
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                قبلی
            </button>
            
            {pages.map(page => (
                <button
                    key={page}
                    className={`${styles.pagination__btn} ${currentPage === page ? styles['pagination__btn--active'] : ''}`}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </button>
            ))}
            
            <button
                className={styles.pagination__btn}
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                بعدی
            </button>
        </div>
    );
}
