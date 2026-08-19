import "./globals.css";
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
        <script
          src="https://telegram.org/js/telegram-web-app.js"
          async
        ></script>
      </head>

      <body>
        <Header />

        <main>{children}</main>

        <BottomNav />
      </body>
    </html>
  );
}