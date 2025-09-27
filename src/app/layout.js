import "@/styles/main.scss";
import Footer from "@/modules/layout/Footer/Footer";

export const metadata = {
  title: "tarh-elahi",
  description: "tarh-elahi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
      <Footer />
    </html>
  );
}