// Updated components/sidebar.tsx with district_admin case
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, QrCode, Calendar, BarChart3, FileText, Menu, X, School, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { UserRole } from "@/lib/types";

interface SidebarProps {
  role: UserRole | "";
  schoolId: string | null;
  onLogout: () => void;
}

const getNavigation = (role: UserRole | "", schoolId: string | null) => {
  switch (role) {
    case "teacher":
      return [
        { name: "Сканер QR", href: "/scanner", icon: QrCode },
        { name: "Мероприятия", href: schoolId ? `/events` : "/events", icon: Calendar },
        { name: "Личный Профиль", href: "/profile/teacher", icon: User },
      ];
    case "parent":
      return [
        { name: "Личный Профиль", href: "/profile/parent", icon: User },
      ];
    case "student":
      return [
        { name: "Личный Профиль", href: "/profile", icon: User },
      ];
    case "school_admin":
      return [
        { name: "Главная", href: "/", icon: Home },
        { name: "Школа", href: "/school", icon: Users },
        { name: "Аналитика", href: "/analytics", icon: BarChart3 },
        { name: "Отчёты", href: "/reports", icon: FileText },
      ];
    case "main_admin":
    case "district_admin":  // Same navigation as main_admin, data filtered by backend
      return [
        { name: "Главная", href: "/", icon: Home },
        { name: "Школы", href: "/schools", icon: School },
        { name: "Аналитика", href: "/analytics", icon: BarChart3 },
        { name: "Отчёты", href: "/reports", icon: FileText },
      ];
    default:
      return [];
  }
};

export function Sidebar({ role, schoolId, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = getNavigation(role, schoolId);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-md"
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200 ease-in-out",
          "lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Uirme</h1>
                <p className="text-sm text-gray-500">Система контроля посещаемости внеклассных мероприятий</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
            <div className="text-xs text-gray-500 text-center mt-2">Система посещаемости v1.0</div>
          </div>
        </div>
      </div>
    </>
  );
}