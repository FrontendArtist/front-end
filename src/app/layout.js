import "@/styles/main.scss";
import '@/app/globals.css';
import Footer from "@/modules/layout/Footer/Footer";
import Navbar from "@/modules/layout/Navbar/Navbar";
import localFont from 'next/font/local';
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
  src: '../assets/fonts/lalezar-regular.ttf',
  variable: '--font-lalezar',
  display: 'swap',
}); 

export const metadata = {
  title: "tarh-elahi",
  description: "tarh-elahi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body  className={` ${shafigh.variable} ${lalezar.variable} ${iranSans.variable}  `}>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}