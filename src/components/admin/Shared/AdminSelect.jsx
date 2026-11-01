'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './AdminSelect.module.scss';

export default function AdminSelect({
    value,
    onChange,
    options = [],
    placeholder = 'انتخاب کنید...',
    icon = null,
    className = '',
    ariaLabel = 'انتخاب گزینه',
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef(null);

    const selectedOption = options.find((opt) => opt.value === value);

    // بستن دراپ‌داون در کلیک خارج از کامپوننت
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // بستن با Escape و جابجایی با کیبورد
    const handleKeyDown = (e) => {
        if (disabled) return;

        if (e.key === 'Escape') {
            setIsOpen(false);
            return;
        }

        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setIsOpen(true);
                setFocusedIndex(options.findIndex((opt) => opt.value === value));
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < options.length) {
                handleSelect(options[focusedIndex].value);
            }
        } else if (e.key === 'Tab') {
            setIsOpen(false);
        }
    };

    const handleSelect = (val) => {
        if (onChange) {
            onChange(val);
        }
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen((prev) => !prev);
        setFocusedIndex(options.findIndex((opt) => opt.value === value));
    };

    return (
        <div
            ref={containerRef}
            className={`${styles.selectWrapper} ${className}`}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                className={`${styles.trigger} ${isOpen ? styles['trigger--open'] : ''}`}
                onClick={toggleOpen}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel}
            >
                <div className={styles.triggerContent}>
                    {icon && <span className={styles.prefixIcon}>{icon}</span>}
                    <span className={styles.triggerLabel}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles['chevron--open'] : ''}`}
                />
            </button>

            {isOpen && (
                <div
                    className={styles.dropdown}
                    role="listbox"
                    aria-label={ariaLabel}
                >
                    {options.map((option, idx) => {
                        const isSelected = option.value === value;
                        const isFocused = idx === focusedIndex;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`${styles.option} ${
                                    isSelected ? styles['option--selected'] : ''
                                } ${isFocused ? styles['option--focused'] : ''}`}
                                onClick={() => handleSelect(option.value)}
                                onMouseEnter={() => setFocusedIndex(idx)}
                            >
                                <div className={styles.optionContent}>
                                    {option.icon && (
                                        <span className={styles.prefixIcon}>{option.icon}</span>
                                    )}
                                    <span>{option.label}</span>
                                </div>
                                {isSelected && (
                                    <Check size={16} className={styles.checkIcon} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

