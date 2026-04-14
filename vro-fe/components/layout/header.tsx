"use client";

import { usePathname, useRouter } from "next/navigation"; 
import { CircleUser, PanelLeftClose, PanelRightClose, LogOut } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/types";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export function Header({ toggleSidebar, isSidebarCollapsed }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter(); 
  const { logout, username } = useAuthStore(); 

  const getPageTitle = () => {
    if (pathname.startsWith("/profile")) return "Profil";
    if (pathname.startsWith("/vendors")) return "Vendors";
    if (pathname.startsWith("/materials")) return "Materials";
    return "Project Tracker";
  };

  const handleLogout = () => {
    logout(); 
    router.push('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 sticky top-0 z-10 dark:bg-gray-950">
      <div className="flex items-center gap-4">
        <Button onClick={toggleSidebar} variant="outline" size="icon" className="hidden md:flex">
          {isSidebarCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
        <h1 className="text-md">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 hidden sm:inline">
          Hi, {username || 'Guest'}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <CircleUser className="h-6 w-6" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator /> */}
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4 text-red-600" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}