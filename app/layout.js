import "./globals.css";
import Script from "next/script";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export const metadata = {
  title: "TahminMerkezi",
  description: "Futbol maçları ve topluluk tahminleri.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />

        <Script
          src="https://sad.adsgram.ai/js/sad.min.js"
          strategy="afterInteractive"
        />
      </head>

      <body>
        <Header />

        <main>{children}</main>

        <BottomNav />
      </body>
    </html>
  );
}