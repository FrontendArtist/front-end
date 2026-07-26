import React from 'react';
import styles from './AdminShared.module.scss';

export default function AdminHeader({ title, count, action }) {
    return (
        <div className={styles.pageHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h1 className={styles.pageTitle}>{title}</h1>
                {count !== undefined && (
                    <span className={styles.pageCount}>{count}</span>
                )}
            </div>
            {action && (
                <div className={styles.pageActions}>
                    {action}
                </div>
            )}
        </div>
    );
}
