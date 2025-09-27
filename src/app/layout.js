import "@/styles/main.scss";
import Footer from "@/modules/layout/Footer/Footer";
import Navbar from "@/modules/layout/Navbar/Navbar";

export const metadata = {
  title: "tarh-elahi",
  description: "tarh-elahi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}