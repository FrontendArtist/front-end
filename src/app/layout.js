import "@/styles/variables.css";
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
  src: '../assets/fonts/Far_Shafigh.ttf',
  variable: '--font-shafigh',
  display: 'swap',
});

const lalezar = localFont({
  src: '../assets/fonts/LALEZAR-REGULAR.TTF',
  variable: '--font-lalezar',
  display: 'swap',
});

export const metadata = {
  title: "tarh-elahi",
  description: "tarh-elahi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
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