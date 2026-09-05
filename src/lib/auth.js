import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { STRAPI_API_URL } from './api';

// ⚠️ هشدار امنیتی: در production حتماً NEXTAUTH_SECRET را در .env تنظیم کنید
if (process.env.NODE_ENV === 'production' && (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET === 'dev-secret-key-change-this')) {
  console.error('🔴 [AUTH] NEXTAUTH_SECRET is not set or using default value in production! This is a security vulnerability.');
}

/**
 * واکشی اطلاعات تکمیلی کاربر (دوره‌ها و فصل‌های خریداری شده و نقش) برای قرارگیری در سشن
 * @param {string} userId - آیدی کاربر در Strapi
 * @param {string} jwt - توکن دسترسی
 */
async function fetchUserSessionData(userId, jwt) {
    try {
        const tokenToUse = process.env.STRAPI_API_TOKEN || jwt;
        const userRes = await fetch(`${STRAPI_API_URL}/api/users/${userId}?populate[0]=courses&populate[1]=role`, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
            cache: 'no-store'
        });
        const contentType = userRes.headers.get('content-type') || '';
        if (userRes.ok && contentType.includes('application/json')) {
            const userData = await userRes.json();
            const courses = userData.courses || [];
            return {
                courses,
                enrolledCourses: courses.map(c => c.id),
                enrolledSlugs: courses.map(c => c.slug).filter(Boolean),
                enrolledChapters: Array.isArray(userData.enrolledChapters)
                    ? userData.enrolledChapters.map(Number)
                    : [],
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                role: userData.role || null,
            };
        }
    } catch (e) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[NextAuth] session callback - failed to fetch user data:', e.message);
        }
    }
    return null;
}

/**
 * دریافت مقدار نرمال‌شده نقش کاربر
 * @param {object} user 
 * @returns {string}
 */
export function getUserRole(user) {
    if (!user || !user.role) return '';
    if (typeof user.role === 'string') return user.role.trim().toLowerCase();
    if (typeof user.role === 'object') {
        return (user.role.type || user.role.name || '').trim().toLowerCase();
    }
    return '';
}

/**
 * بررسی اینکه کاربر ادمین (administrator) است یا خیر
 * @param {object} user 
 * @returns {boolean}
 */
export function isUserAdmin(user) {
    const role = getUserRole(user);
    return role === 'administrator' || role === 'admin';
}

/**
 * بررسی اینکه کاربر منتور / استاد (mentor) یا ادمین است یا خیر
 * @param {object} user 
 * @returns {boolean}
 */
export function isUserMentor(user) {
    const role = getUserRole(user);
    return role === 'mentor' || role === 'استاد' || role === 'administrator' || role === 'admin';
}


export const authOptions = {
    providers: [
        CredentialsProvider({
            id: 'otp-login',
            name: 'ورود با کد یکبار مصرف',
            credentials: {
                phoneNumber: { label: 'شماره موبایل', type: 'text' },
                otpCode: { label: 'کد تایید', type: 'text' },
            },
            async authorize(credentials) {
                const { phoneNumber, otpCode } = credentials;

                if (!phoneNumber || !otpCode) return null;

                const verifyUrl = `${STRAPI_API_URL}/api/auth/otp/verify`;

                try {
                    const response = await fetch(verifyUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phoneNumber, otpCode }),
                        cache: 'no-store'
                    });

                    // خواندن پاسخ صریح متنی قبل از پارس JSON برای جلوگیری از کرش <!DOCTYPE
                    const contentType = response.headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) {
                        console.error('[NextAuth] Response is not JSON:', contentType);
                        return null;
                    }

                    const data = await response.json();

                    if (!response.ok) {
                        console.error('[NextAuth] Verification failed:', data);
                        return null;
                    }

                    const { jwt, user } = data;

                    if (user && jwt) {
                        return { 
                            ...user, 
                            id: user.id, 
                            jwt: jwt,
                            role: user.role || 'user'
                        };
                    }
                    return null;
                } catch (error) {
                    console.error('[NextAuth] authorize error:', error.message);
                    return null;
                }
            },
        }),

        CredentialsProvider({
            id: 'password-login',
            name: 'ورود با رمز عبور',
            credentials: {
                phoneNumber: { label: 'شماره موبایل', type: 'text' },
                password: { label: 'رمز عبور', type: 'password' },
                isRegister: { label: 'ثبت‌نام', type: 'text' },
                firstName: { label: 'نام', type: 'text' },
                lastName: { label: 'نام خانوادگی', type: 'text' },
                email: { label: 'ایمیل', type: 'text' },
            },
            async authorize(credentials) {
                const { phoneNumber, password, isRegister, firstName, lastName, email } = credentials;

                if (!phoneNumber || !password) return null;

                const endpoint = isRegister === 'true'
                    ? `${STRAPI_API_URL}/api/auth/password/register`
                    : `${STRAPI_API_URL}/api/auth/password/login`;

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phoneNumber, password, firstName, lastName, email }),
                        cache: 'no-store'
                    });

                    const contentType = response.headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) {
                        console.error('[NextAuth] Response is not JSON:', contentType);
                        return null;
                    }

                    const data = await response.json();

                    if (!response.ok) {
                        const errMsg = data?.error?.message || data?.error || 'اطلاعات ورود اشتباه است';
                        throw new Error(errMsg);
                    }

                    const { jwt, user } = data;

                    if (user && jwt) {
                        return { 
                            ...user, 
                            id: user.id, 
                            jwt: jwt,
                            role: user.role || 'user'
                        };
                    }
                    return null;
                } catch (error) {
                    console.error('[NextAuth] password authorize error:', error.message);
                    throw error;
                }
            },
        }),

        GoogleProvider({
            clientId: process.env.GOOGLE_ID || '',
            clientSecret: process.env.GOOGLE_SECRET || '',
            allowDangerousEmailAccountLinking: true
        }),
    ],

    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.jwt = user.jwt;
                token.phoneNumber = user.phoneNumber;
                token.role = user.role; // انتقال role به توکن
                token.firstName = user.firstName || '';
                token.lastName = user.lastName || '';
            }
            if (trigger === 'update' && session) {
                if (session.firstName !== undefined) token.firstName = session.firstName;
                if (session.lastName !== undefined) token.lastName = session.lastName;
            }
            return token;
        },
        async session({ session, token }) {
            if (session && session.user && token) {
                session.user.id = token.id;
                session.user.jwt = token.jwt;
                session.user.phoneNumber = token.phoneNumber;
                session.user.role = token.role; // انتقال role به سشن برای دسترسی در فرانت‌اند
                session.user.firstName = token.firstName || '';
                session.user.lastName = token.lastName || '';

                // واکشی آخرین وضعیت دوره‌ها و فصل‌های فعال کاربر از استراپی
                if (token.id) {
                    const extraData = await fetchUserSessionData(token.id, token.jwt);
                    if (extraData) {
                        session.user.courses = extraData.courses;
                        session.user.enrolledCourses = extraData.enrolledCourses;
                        session.user.enrolledSlugs = extraData.enrolledSlugs;
                        session.user.enrolledChapters = extraData.enrolledChapters;
                        if (extraData.firstName !== undefined) session.user.firstName = extraData.firstName;
                        if (extraData.lastName !== undefined) session.user.lastName = extraData.lastName;
                        if (extraData.role) {
                            session.user.role = extraData.role;
                            token.role = extraData.role;
                        }
                    }
                }
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-this',
    trustHost: true,
    logger: {
        error(code, metadata) {
            console.error(`🔴 [NextAuth]: ${code}`, metadata?.message || metadata || '');
        },
        warn(code) {
            console.warn(`🟡 [NextAuth]: ${code}`);
        },
    },
};

