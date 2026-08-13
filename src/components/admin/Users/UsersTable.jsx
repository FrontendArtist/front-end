'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import UserDetailsDrawer from './UserDetailsDrawer';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import styles from './Users.module.scss';

/**
 * LightCell — نمایش نور + دکمه + با popover برای یک کاربر خاص
 */
function LightCell({ user, onLightUpdated }) {
    const [localLight, setLocalLight] = useState(user.light ?? 0);
    const [open, setOpen] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

    const btnRef = useRef(null);
    const popoverRef = useRef(null);

    // همگام‌سازی موجودی نور با prop
    useEffect(() => {
        setLocalLight(user.light ?? 0);
    }, [user.light]);

    const formatNum = (n) => new Intl.NumberFormat('fa-IR').format(n);

    const handleToggle = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPopoverPos({
                top: rect.bottom + window.scrollY + 6,
                left: rect.right + window.scrollX - 160,
            });
        }
        setOpen(o => !o);
        setError(null);
        setInputVal('');
    };

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    const handleAdd = async () => {
        const amount = parseInt(inputVal, 10);
        if (!amount || amount <= 0) { setError('مقدار نامعتبر'); return; }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/users/${user.id}/light`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addAmount: amount }),
            });
            if (!res.ok) throw new Error('خطا در ذخیره');
            const data = await res.json();
            setLocalLight(data.newLight);
            if (onLightUpdated) onLightUpdated(user.id, data.newLight);
            setInputVal('');
            setOpen(false);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.lightCellContainer}>
            <span className={styles.lightValue}>
                {formatNum(localLight)}
                <button
                    ref={btnRef}
                    title="افزایش نور کاربر"
                    onClick={handleToggle}
                    className={`${styles.lightAddBtn} ${open ? styles.open : ''}`}
                >
                    +
                </button>
            </span>

            {open && typeof window !== 'undefined' && createPortal(
                <div
                    ref={popoverRef}
                    className={styles.popover}
                    style={{
                        top: `${popoverPos.top}px`,
                        left: `${popoverPos.left}px`,
                    }}
                >
                    <span className={styles.popoverTitle}>
                        افزایش نور کاربر
                    </span>
                    <div className={styles.popoverRow}>
                        <input
                            type="number"
                            min="1"
                            value={inputVal}
                            onChange={e => { setInputVal(e.target.value); setError(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                            placeholder="مقدار"
                            autoFocus
                            className={styles.popoverInput}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={loading}
                            className={styles.popoverSubmitBtn}
                        >
                            {loading ? '...' : 'ثبت'}
                        </button>
                    </div>
                    {error && (
                        <span className={styles.popoverError}>
                            {error}
                        </span>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}

/**
 * BulkLightHeader — دکمه + در هدر جدول برای اهدا نور دسته‌جمعی به تمام کاربران
 */
function BulkLightHeader({ onBulkAdded }) {
    const [open, setOpen] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

    const btnRef = useRef(null);
    const popoverRef = useRef(null);

    const handleToggle = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPopoverPos({
                top: rect.bottom + window.scrollY + 6,
                left: rect.right + window.scrollX - 170,
            });
        }
        setOpen(o => !o);
        setError(null);
        setInputVal('');
    };

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    const handleBulkSubmit = async () => {
        const amount = parseInt(inputVal, 10);
        if (!amount || amount <= 0) { setError('مقدار نامعتبر'); return; }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/users/bulk-light', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'خطا در اهدا گروهی نور');
            }

            if (onBulkAdded) {
                onBulkAdded(amount);
            }
            setInputVal('');
            setOpen(false);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.bulkHeaderContainer}>
            <span>نور ★</span>
            <button
                ref={btnRef}
                title="اهدا نور به تمامی کاربران"
                onClick={handleToggle}
                className={`${styles.lightAddBtn} ${open ? styles.open : ''}`}
            >
                +
            </button>

            {open && typeof window !== 'undefined' && createPortal(
                <div
                    ref={popoverRef}
                    className={styles.popover}
                    style={{
                        top: `${popoverPos.top}px`,
                        left: `${popoverPos.left}px`,
                        width: '180px',
                    }}
                >
                    <span className={styles.popoverTitle}>
                        اهدا نور به همه کاربران
                    </span>
                    <div className={styles.popoverRow}>
                        <input
                            type="number"
                            min="1"
                            value={inputVal}
                            onChange={e => { setInputVal(e.target.value); setError(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleBulkSubmit(); }}
                            placeholder="مقدار برای هر کاربر"
                            autoFocus
                            className={styles.popoverInput}
                        />
                        <button
                            onClick={handleBulkSubmit}
                            disabled={loading}
                            className={styles.popoverSubmitBtn}
                        >
                            {loading ? '...' : 'ثبت'}
                        </button>
                    </div>
                    {error && (
                        <span className={styles.popoverError}>
                            {error}
                        </span>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}

export default function UsersTable({ initialUsers }) {
    const [usersList, setUsersList] = useState(initialUsers);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        setUsersList(initialUsers);
    }, [initialUsers]);

    const handleSingleLightUpdated = (userId, newLight) => {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, light: newLight } : u));
    };

    const handleBulkLightAdded = (addAmount) => {
        setUsersList(prev => prev.map(u => ({ ...u, light: (u.light ?? 0) + addAmount })));
    };

    const filteredUsers = usersList.filter((u) => {
        const query = searchQuery.toLowerCase();
        return (
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.phoneNumber && u.phoneNumber.includes(query))
        );
    });

    const headers = [
        'شماره',
        'نام کاربری',
        'ایمیل',
        'شماره موبایل',
        'نقش',
        <BulkLightHeader key="bulk-light-header" onBulkAdded={handleBulkLightAdded} />,
        'تاریخ عضویت',
        'عملیات'
    ];

    return (
        <AdminTableContainer>
            <AdminToolbar>
                <AdminSearch
                    placeholder="جستجو (نام، ایمیل، موبایل)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </AdminToolbar>

            <AdminTable headers={headers}>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => (
                        <tr key={user.documentId}>
                            <td>{index + 1}</td>
                            <td>
                                <div className={styles.usernameText}>
                                    {user.username}
                                </div>
                                {(user.firstName || user.lastName) && (
                                    <div className={styles.userFullNameText}>
                                        {user.firstName} {user.lastName}
                                    </div>
                                )}
                            </td>
                            <td className={styles.emailCell}>{user.email}</td>
                            <td>{user.phoneNumber}</td>
                            <td>
                                <AdminBadge status={user.role} />
                            </td>
                            <td>
                                <LightCell user={user} onLightUpdated={handleSingleLightUpdated} />
                            </td>
                            <td>{new Intl.DateTimeFormat('fa-IR').format(new Date(user.createdAt))}</td>
                            <td>
                                <AdminButton
                                    onClick={() => setSelectedUserId(user.id)}
                                    variant="default"
                                >
                                    مشاهده پروفایل
                                </AdminButton>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="8" className={styles.emptyTableCell}>
                            کاربری یافت نشد.
                        </td>
                    </tr>
                )}
            </AdminTable>

            {selectedUserId && (
                <UserDetailsDrawer
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </AdminTableContainer>
    );
}
