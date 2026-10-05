/**
 * @file src/app/admin/layout.jsx
 * @description Admin Dashboard Layout – Server Component
 *
 * 🔐 Authorization Strategy:
 * This is a SERVER COMPONENT, which means the session check happens on the
 * server BEFORE any HTML is sent to the browser. This is the most secure
 * approach because:
 *   1. The role check cannot be bypassed by disabling client-side JavaScript.
 *   2. The restricted content is never bundled or shipped to unauthorized users.
 *   3. next/navigation `redirect()` triggers a server-side HTTP redirect (307),
 *      so the browser never even renders the admin routes for non-admins.
 *
 * 🧩 Role Check:
 * We verify `session?.user?.role?.type === 'administrator'`.
 * The `role` object is populated by Strapi's Users & Permissions plugin and
 * forwarded through the NextAuth JWT → session callback chain in `src/lib/auth.js`.
 *
 * 📌 If the role check fails (user is not logged in or not an administrator),
 * the user is immediately redirected to the home page `/`.
 */

// Server-side session retrieval from NextAuth
import { getServerSession } from 'next-auth/next';

// authOptions holds all provider/callback configuration for NextAuth
import { authOptions, isUserAdmin } from '@/lib/auth';

// next/navigation redirect is the correct way to redirect inside Server Components
import { redirect } from 'next/navigation';

// The interactive sidebar component (Client Component)
import AdminSidebar from '@/components/admin/Sidebar/AdminSidebar';

// گارد متمرکز مجوزها و کانتکست
import { PermissionsProvider } from '@/context/PermissionsContext';
import AdminRouteGuard from '@/components/admin/Permissions/AdminRouteGuard';
import { getAdminCurrentUserPermissions } from '@/lib/byeMoneyApi';

// Modular SCSS for the dashboard wrapper layout
import styles from './admin.module.scss';

/**
 * AdminLayout – Root layout for all routes under /admin/*
 *
 * Next.js will automatically wrap every page inside /app/admin/ with this layout.
 * The `children` prop represents the matched page content.
 *
 * @param {{ children: React.ReactNode }} props
 */
export default async function AdminLayout({ children }) {
    // ─────────────────────────────────────────────────────────────────
    // STEP 1: Retrieve the current session from the server.
    // ─────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);

    // ─────────────────────────────────────────────────────────────────
    // STEP 2: Authorization Gate (Initial admin check)
    // ─────────────────────────────────────────────────────────────────
    if (!session || !session.user || !isUserAdmin(session.user)) {
        redirect('/');
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 3: Fetch current admin permissions from ByeMoney
    // ─────────────────────────────────────────────────────────────────
    const permissionsData = await getAdminCurrentUserPermissions({ jwt: session.user.jwt });

    // ─────────────────────────────────────────────────────────────────
    // STEP 4: Authorized – Render the Admin Dashboard Shell with PermissionsProvider
    // ─────────────────────────────────────────────────────────────────
    return (
        <PermissionsProvider
            initialPermissions={permissionsData.permissions}
            initialRoles={permissionsData.roles}
            isLoaded={permissionsData.isLoaded}
        >
            <div className={styles.dashboard}>
                {/* AdminSidebar receives user and reads permissions from context */}
                <AdminSidebar user={session.user} />

                {/* Main content area – guarded by AdminRouteGuard */}
                <main className={styles.dashboard__main}>
                    <AdminRouteGuard>
                        {children}
                    </AdminRouteGuard>
                </main>
            </div>
        </PermissionsProvider>
    );
}
