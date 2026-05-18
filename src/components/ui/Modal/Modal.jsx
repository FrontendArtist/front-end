import React, { useEffect } from 'react';
import styles from './Modal.module.scss';

/**
 * Global Modal Component
 * 
 * @param {boolean} isOpen - Modal open state
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 */
export default function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    {title && <h2 className={styles.title}>{title}</h2>}
                    <button className={styles.closeButton} onClick={onClose} aria-label="بستن">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
                <div className={styles.content}>
                    {children}
                </div>
            </div>
        </div>
    );
}
