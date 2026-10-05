import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { QueryProvider } from "@/components/providers/query-provider";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

const fontUi = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

const fontData = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — find local shops & services`,
    template: `%s — ${APP_NAME}`,
  },
  description: "Find anything nearby. Compare. Order or book. Pick it up.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${fontUi.variable} ${fontData.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
