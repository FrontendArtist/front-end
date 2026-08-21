import "@/styles/variables.css";
import "@/styles/light-theme.css";
import "@/styles/main.scss";
import '@/app/globals.css';
import Footer from "@/components/layout/Footer/Footer";
import Navbar from "@/components/layout/Navbar/Navbar";
import AuthModal from "@/components/auth/AuthModal";
import { Providers } from "./providers";
import localFont from 'next/font/local';
import CartSyncProvider from "@/components/providers/CartSyncProvider";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import Script from "next/script";

const iranSans = localFont({
  src: '../assets/fonts/iransans_regular/iransans-regular-webfont.ttf',
  variable: '--font-iransans',
  display: 'swap',
});

const shafigh = localFont({
  src: '../assets/fonts/far_shafigh.ttf',
  variable: '--font-shafigh',
  display: 'swap',
});

const lalezar = localFont({
  src: '../assets/fonts/lalezar-regular.ttf',
  variable: '--font-lalezar',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description: `مرجع آموزش و محصولات معنوی ${SITE_NAME}`,
  openGraph: {
    title: SITE_NAME,
    description: `مرجع آموزش و محصولات معنوی ${SITE_NAME}`,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'fa_IR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', savedTheme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <CartSyncProvider />
          <Navbar />
          {children}
          <Footer />
          <AuthModal />
        </Providers>
      </body>
    </html>
  );
}