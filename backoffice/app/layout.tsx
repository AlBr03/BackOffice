import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { AppBrand } from "@/components/app-brand";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import "./globals.css";
import { DropdownProvider } from "@/components/dropdown-provider";
import { loadDropdownSettings } from "@/lib/dropdown-settings-server";
import { canManageDropdowns } from "@/lib/dropdown-settings";
import { loadBusinessSettings, loadPersonalSettings } from "@/lib/business-settings-server";
import { defaultPersonalSettings } from "@/lib/business-settings";
import { BusinessProvider } from "@/components/business-provider";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const { settings } = await loadDropdownSettings();
  const [{ settings: business }, personalResult] = await Promise.all([loadBusinessSettings(), user ? loadPersonalSettings(user.id) : Promise.resolve({ settings: defaultPersonalSettings() })]);
  const personal = personalResult.settings;
  const uiMode = (cookieStore.get("ui-mode")?.value ?? personal.mode) === "dark" ? "mode-dark" : "mode-light";

  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${uiTheme} ${uiMode} app-shell min-h-full`} style={{ margin: 0 }}>
        <BusinessProvider business={business} personal={personal}>
        <header className="app-header">
          <div className="app-header__inner">
            <AppBrand />

            <HeaderProfileMenu role={profile?.role ?? null} />
          </div>
        </header>

        <main className="app-main">
          <DropdownProvider settings={settings} canManage={canManageDropdowns(profile?.role)}>{children}</DropdownProvider>
        </main>
        </BusinessProvider>
      </body>
    </html>
  );
}
