'use client';

import { useState } from 'react';
import styles from './Users.module.scss';
import UserDetailsDrawer from './UserDetailsDrawer';

export default function UsersTable({ initialUsers }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null); // numeric id for users-permissions

    // Filter logic
    const filteredUsers = initialUsers.filter((u) => {
        const query = searchQuery.toLowerCase();
        return (
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.phoneNumber && u.phoneNumber.includes(query))
        );
    });

    return (
        <div className={styles.tableContainer}>
            <input
                type="text"
                placeholder="جستجو (نام، ایمیل، موبایل)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchBar}
            />

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>شماره</th>
                        <th>نام کاربری</th>
                        <th>ایمیل</th>
                        <th>شماره موبایل</th>
                        <th>نقش</th>
                        <th>تاریخ عضویت</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((user, index) => (
                            <tr key={user.documentId}>
                                <td>{index + 1}</td>
                                <td>
                                    {user.username}
                                    {(user.firstName || user.lastName) && (
                                        <div style={{ fontSize: 'var(--font-ssm)', opacity: 0.7 }}>
                                            {user.firstName} {user.lastName}
                                        </div>
                                    )}
                                </td>
                                <td dir="ltr" style={{ textAlign: 'right' }}>{user.email}</td>
                                <td>{user.phoneNumber}</td>
                                <td>
                                    <span className={`${styles.badge} ${user.role === 'Administrator' ? styles['badge--admin'] : styles['badge--user']}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>{new Intl.DateTimeFormat('fa-IR').format(new Date(user.createdAt))}</td>
                                <td>
                                    <button
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={styles.btnAction}
                                    >
                                        مشاهده پروفایل
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-title-text-desktop)' }}>
                                کاربری یافت نشد.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Slider Drawer Component */}
            {
                selectedUserId && (
                    <UserDetailsDrawer
                        userId={selectedUserId}
                        onClose={() => setSelectedUserId(null)}
                    />
                )
            }
        </div >
    );
}
