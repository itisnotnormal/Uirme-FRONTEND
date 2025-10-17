"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { jwtDecode } from "jwt-decode";
import type { UserRole } from "@/lib/types";

export function SidebarClient() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [role, setRole] = useState<UserRole | "">("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const updateAuthState = () => {
    // Проверяем, что мы на клиенте
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
          console.log("Token expired, logging out...");
          localStorage.removeItem("token");
          setHasToken(false);
          setRole("");
          setSchoolId(null);
          router.push("/login");
          return;
        }
        setRole(decoded.role || "");
        setSchoolId(decoded.school_id || null);
        setHasToken(true);
      } catch (err) {
        console.error("Error decoding token:", err);
        localStorage.removeItem("token");
        setHasToken(false);
        setRole("");
        setSchoolId(null);
        router.push("/login");
      }
    } else {
      setHasToken(false);
      setRole("");
      setSchoolId(null);
    }
  };

  useEffect(() => {
    // Устанавливаем isMounted в true после монтирования на клиенте
    setIsMounted(true);
    updateAuthState();

    // Обработчик событий для изменений токена
    const handleTokenChange = () => {
      console.log("Token change detected");
      updateAuthState();
    };

    window.addEventListener("storage", handleTokenChange);
    window.addEventListener("tokenChange", handleTokenChange);

    return () => {
      window.removeEventListener("storage", handleTokenChange);
      window.removeEventListener("tokenChange", handleTokenChange);
    };
  }, [router]);

  const handleLogout = () => {
    console.log("Logging out...");
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setHasToken(false);
    setRole("");
    setSchoolId(null);
    window.dispatchEvent(new Event("tokenChange"));
    router.push("/login");
  };

  // Если компонент еще не смонтирован на клиенте, ничего не рендерим
  if (!isMounted) {
    return null;
  }

  // Проверяем наличие токена на клиенте
  if (!hasToken) {
    console.log("No token or hasToken is false, hiding sidebar");
    return null;
  }

  return <Sidebar role={role} schoolId={schoolId} onLogout={handleLogout} />;
}