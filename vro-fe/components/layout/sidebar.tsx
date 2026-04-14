"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutGrid, Truck, PackageCheck, User, PencilRuler, Building2, WatchIcon, CalendarArrowDown, ToolCase, LayoutDashboard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/types";

interface SidebarProps {
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { username, role, companyName } = useAuthStore();

  const allNavLinks = [
    { 
      href: "/materials", 
      label: "Rpl. Stock Monitoring", 
      icon: ToolCase, 
      allowedRoles: ['Superuser', 'Admin', 'Vendor', 'Viewer']
    },
    { 
      href: "/dashboard-rpl", 
      label: "Dashboard Summary", 
      icon: LayoutDashboard, 
      allowedRoles: ['Superuser', 'Admin', 'Vendor', 'Viewer'] 
    },
    { 
      href: "/vendors", 
      label: "Vendor", 
      icon: Building2, 
      allowedRoles: ['Superuser', 'Admin']
    },
    { 
      href: "/profile", 
      label: "User", 
      icon: User, 
      allowedRoles: ['Superuser', 'Admin', 'Vendor', 'Viewer']
    },
  ];

  const navLinks = allNavLinks.filter(link => role && link.allowedRoles.includes(role));

  const userInitial = username ? username.charAt(0).toUpperCase() : "G";
  
  const displayName = role === 'Vendor' ? companyName : username;
  const displayRole = role === 'Vendor' ? `Vendor (${companyName})` : role;


  return (
    <>
      <TooltipProvider delayDuration={0}>
        <aside
          className={cn(
            "hidden flex-col border-r bg-white sm:flex dark:bg-gray-950 transition-[width] duration-300 ease-in-out",
            isCollapsed ? "w-[72px]" : "w-72"
          )}
        >
          <div className="flex h-full flex-col justify-between p-4">
            <div>
              <div className={cn("mb-8 px-2", isCollapsed && "hidden px-0 text-center")}>
                <p className={cn("text-sm text-gray-500", isCollapsed && "hidden")}>Selamat Datang,</p>
                <h2 className={cn("text-2xl truncate", isCollapsed && "text-xl")}>
                  {`${displayName} 👋`}
                </h2>
              </div>
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => {
                  const isActive = (pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)));
                  return isCollapsed ? (
                    <Tooltip key={link.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 font-light transition-all hover:bg-gray-100 hover:text-black",
                            isActive && "bg-gray-100 text-[#008A15] font-light"
                          )}
                        >
                          <link.icon className="h-5 w-5" />
                          <span className="sr-only">{link.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{link.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-100 hover:text-black font-light",
                        isActive && "bg-gray-100 text-[#008A15] font-light"
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                 })}
              </nav>
            </div>
            <div className="flex items-center gap-4 mt-4 border-t pt-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#008A15] text-white flex-shrink-0">
                <span className="text-lg">{userInitial}</span>
              </div>
              <div className={cn("overflow-hidden", isCollapsed && "hidden")}>
                <p className="truncate">{displayName || "Guest"}</p>
                <p className="text-sm text-gray-500 truncate">{displayRole || "Unknown Role"}</p>
              </div>
            </div>
          </div>
        </aside>
      </TooltipProvider>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-white p-2 sm:hidden dark:bg-gray-950"
      >
        {navLinks.map((link) => {
          const isActive = (pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)));

          if (link.href === "/profile") {
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg w-20",
                  isActive ? "text-[#008A15]" : "text-gray-600"
                )}
              >
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-700 flex-shrink-0 text-sm",
                  isActive && "bg-[#008A15] text-white"
                )}>
                  <span>{userInitial}</span>
                </div>
                <span className="text-xs font-light mt-1 truncate">{link.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center rounded-lg p-2 text-gray-600 transition-all hover:bg-gray-100 w-20",
                isActive && "text-[#008A15]"
              )}
            >
              <link.icon className="h-5 w-5" />
              <span className="text-xs font-light mt-1 truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}