"use client";

import "./globals.css"
import { Lexend, JetBrains_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import * as React from "react"
import { usePathname } from "next/navigation"
import AuthProvider from "@/components/login/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { IdleLogoutHandler } from "@/components/ui/idle-logout";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)
  const pathname = usePathname()
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed)

  const isLoginPage = pathname === "/login"

  return (
    <html
      lang="en"
      className={cn(lexend.variable, jetbrains.variable)} 
      suppressHydrationWarning
    >
      <body className="h-screen overflow-hidden">
        <AuthProvider>
          {/* <IdleLogoutHandler /> */}
          {isLoginPage ? (
            <main className="min-h-screen bg-white dark:bg-gray-900">
              {children}
            </main>
          ) : (
            <div
              className={cn(
                "flex flex-col h-screen overflow-hidden min-w-0 md:grid md:transition-[grid-template-columns] duration-300 ease-in-out",
                isSidebarCollapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[288px_1fr]"
              )}
            >
              <Sidebar isCollapsed={isSidebarCollapsed} />
              <div className="flex flex-col bg-white dark:bg-gray-900 h-full overflow-hidden">
                <Header toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
                
                <main className="flex flex-1 flex-col p-6 overflow-hidden">
                  {children}
                </main>
              </div>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  )
}