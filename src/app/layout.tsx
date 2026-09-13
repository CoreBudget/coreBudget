import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { SerwistProvider } from "@serwist/turbopack/react";
import theme from "@/theme";
import { ToastProvider } from "./_shared/ToastProvider";
import "./globals.css";
// Structural/positioning rules only (position: fixed, z-index, overlay, arrow placement).
// Colors are re-themed per-tour from live theme tokens in src/app/_shared/tours/driverTheme.ts.
import "driver.js/dist/driver.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0e12",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: "CoreBudget",
    description: t("common.appDescription"),
    manifest: "/manifest.json",
    icons: {
      apple: "/icons/icon-192.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "CoreBudget",
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning className={roboto.variable}>
      <body>
        <InitColorSchemeScript attribute="data" defaultMode="dark" />
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <ThemeProvider theme={theme} defaultMode="dark">
            <CssBaseline />
            <NextIntlClientProvider>
              <SerwistProvider
                swUrl="/serwist/sw.js"
                disable={process.env.NODE_ENV === "development"}
              >
                <ToastProvider>{children}</ToastProvider>
              </SerwistProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
