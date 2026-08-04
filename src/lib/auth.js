import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

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

        GoogleProvider({
            clientId: process.env.GOOGLE_ID || '',
            clientSecret: process.env.GOOGLE_SECRET || '',
            allowDangerousEmailAccountLinking: true
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.jwt = user.jwt;
                token.phoneNumber = user.phoneNumber;
                token.role = user.role; // انتقال role به توکن
            }
            return token;
        },
        async session({ session, token }) {
            if (session && session.user && token) {
                session.user.id = token.id;
                session.user.jwt = token.jwt;
                session.user.phoneNumber = token.phoneNumber;
                session.user.role = token.role; // انتقال role به سشن برای دسترسی در فرانت‌اند

                // واکشی آخرین وضعیت دوره‌ها و فصل‌های فعال کاربر از استراپی
                if (token.id) {
                    try {
                        const tokenToUse = token.jwt || process.env.STRAPI_API_TOKEN;
                        const userRes = await fetch(`${STRAPI_API_URL}/api/users/${token.id}?populate[0]=courses`, {
                            headers: { Authorization: `Bearer ${tokenToUse}` },
                            cache: 'no-store'
                        });
                        const contentType = userRes.headers.get('content-type') || '';
                        if (userRes.ok && contentType.includes('application/json')) {
                            const userData = await userRes.json();
                            const courses = userData.courses || [];
                            session.user.courses = courses;
                            session.user.enrolledCourses = courses.map(c => c.id);
                            session.user.enrolledSlugs = courses.map(c => c.slug).filter(Boolean);
                            session.user.enrolledChapters = Array.isArray(userData.enrolledChapters)
                                ? userData.enrolledChapters.map(Number)
                                : [];
                        }
                    } catch (e) {
                        // در صورت بروز خطا، سشن بدون افت عملکرد بازمی‌گردد
                    }
                }
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-this',
    trustHost: true,
};