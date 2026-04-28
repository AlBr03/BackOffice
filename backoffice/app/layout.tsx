import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "INTERSPORT Backoffice",
  description: "Backoffice voor winkels, hoofdkantoor en printafdeling",
};

const uiTheme = process.env.NEXT_PUBLIC_UI_THEME === "classic" ? "theme-classic" : "theme-modern";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const uiMode = cookieStore.get("ui-mode")?.value === "dark" ? "mode-dark" : "mode-light";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${uiTheme} ${uiMode} app-shell min-h-full`} style={{ margin: 0 }}>
        <header className="app-header">
          <div className="app-header__inner">
            <Link
              href="/dashboard"
              className="app-brand"
            >
              INTERSPORT Backoffice
            </Link>

            <HeaderProfileMenu role={profile?.role ?? null} />
          </div>
        </header>

        <main className="app-main">
          {children}
        </main>
      </body>
    </html>
  );
}
