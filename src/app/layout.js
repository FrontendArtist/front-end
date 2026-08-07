import "@/styles/variables.css";
import "@/styles/light-theme.css";
import "@/styles/main.scss";
import '@/app/globals.css';
import Footer from "@/modules/layout/Footer/Footer";
import Navbar from "@/modules/layout/Navbar/Navbar";
import AuthModal from "@/components/auth/AuthModal";
import { Providers } from "./providers";
import localFont from 'next/font/local';
import CartSyncProvider from "@/components/layout/CartSyncProvider";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tarhelahi.ir'),
  title: {
    default: "طرح الهی",
    template: "%s | طرح الهی"
  },
  description: "مرجع آموزش و محصولات فرهنگی طرح الهی",
  openGraph: {
    title: 'طرح الهی',
    description: 'مرجع آموزش و محصولات فرهنگی طرح الهی',
    url: '/',
    siteName: 'طرح الهی',
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
        <script
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