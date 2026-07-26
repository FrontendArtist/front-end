'use client';

import { useState } from 'react';
import UserDetailsDrawer from './UserDetailsDrawer';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';

export default function UsersTable({ initialUsers }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Filter logic
    const filteredUsers = initialUsers.filter((u) => {
        const query = searchQuery.toLowerCase();
        return (
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.phoneNumber && u.phoneNumber.includes(query))
        );
    });

    const headers = ['شماره', 'نام کاربری', 'ایمیل', 'شماره موبایل', 'نقش', 'تاریخ عضویت', 'عملیات'];

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
                                <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-card-text)' }}>
                                    {user.username}
                                </div>
                                {(user.firstName || user.lastName) && (
                                    <div style={{ fontSize: 'var(--font-ssm)', opacity: 0.7 }}>
                                        {user.firstName} {user.lastName}
                                    </div>
                                )}
                            </td>
                            <td dir="ltr" style={{ textAlign: 'right' }}>{user.email}</td>
                            <td>{user.phoneNumber}</td>
                            <td>
                                <AdminBadge status={user.role} />
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
                        <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-title-text-desktop)' }}>
                            کاربری یافت نشد.
                        </td>
                    </tr>
                )}
            </AdminTable>

            {/* Slider Drawer Component */}
            {selectedUserId && (
                <UserDetailsDrawer
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </AdminTableContainer>
    );
}
