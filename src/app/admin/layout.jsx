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
import { authOptions } from '@/lib/auth';

// next/navigation redirect is the correct way to redirect inside Server Components
import { redirect } from 'next/navigation';

// The interactive sidebar component (Client Component)
import AdminSidebar from '@/components/admin/Sidebar/AdminSidebar';

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
    // `getServerSession` reads the encrypted JWT cookie and decodes it
    // using the same `secret` defined in authOptions.
    // This call is safe to make on every request; NextAuth caches it
    // internally for the duration of the request.
    // ─────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);

    // ─────────────────────────────────────────────────────────────────
    // STEP 2: Authorization Gate
    //
    // Condition breakdown:
    //   • !session                    → User is not logged in at all.
    //   • !session.user               → Session exists but user object is missing (edge case).
    //   • session.user.role?.type !== 'administrator'
    //                                 → User is logged in but is NOT an administrator.
    //                                   The `?.` optional chain handles cases where
    //                                   `role` is null/undefined (e.g., plain user accounts
    //                                   that Strapi returns without a role object).
    //
    // Any of these conditions → immediate server-side redirect to home page.
    // ─────────────────────────────────────────────────────────────────
    if (!session || !session.user || session.user.role?.type !== 'administrator') {
        /**
         * `redirect('/')` from 'next/navigation' throws a special Next.js error
         * that terminates rendering and issues a 307 Temporary Redirect response.
         * Do NOT wrap this in a try/catch – it must propagate up.
         */
        redirect('/');
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 3: Authorized – Render the Admin Dashboard Shell
    //
    // At this point we know the user is a verified administrator.
    // We render a two-column layout:
    //   • Left column  → AdminSidebar (fixed navigation)
    //   • Right column → {children} (the actual admin page content)
    // ─────────────────────────────────────────────────────────────────
    return (
        <div className={styles.dashboard}>
            {/*
       * AdminSidebar is a Client Component ('use client') to support:
       *   - usePathname() for active link detection
       *   - Hover / toggle animations
       * We pass the user's name for the profile display section.
       */}
            <AdminSidebar user={session.user} />

            {/* Main content area – renders the matched /admin/[page] */}
            <main className={styles.dashboard__main}>
                {children}
            </main>
        </div>
    );
}
