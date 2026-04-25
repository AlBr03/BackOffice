import type { Metadata } from "next";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
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
      <body className="min-h-full" style={{ margin: 0 }}>
        <header
          style={{
            background: "linear-gradient(90deg, #082D78 0%, #164196 65%, #E30613 100%)",
            color: "white",
            padding: "18px 28px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Link
              href="/dashboard"
              style={{
                color: "white",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 30,
                letterSpacing: 0.3,
              }}
            >
              INTERSPORT Backoffice
            </Link>

            <HeaderProfileMenu role={profile?.role ?? null} />
          </div>
        </header>

        <main
          style={{
            padding: 24,
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
