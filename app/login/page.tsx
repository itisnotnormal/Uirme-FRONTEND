"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, AlertCircle } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { toast } from "sonner"; // Добавляем sonner для уведомлений

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !role) {
      setError("Пожалуйста, заполните все поля");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка при входе");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      window.dispatchEvent(new Event("tokenChange"));
      setLoading(false);

      // Перенаправление в зависимости от роли
      if (role === "district_admin") {
        router.push("/district-admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("[v0] Login error:", err);
      setError(err.message || "Произошла ошибка. Попробуйте снова.");
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: "teacher", label: "Преподаватель" },
    { value: "parent", label: "Родитель" },
    { value: "student", label: "Школьник" },
    { value: "school_admin", label: "Админ школы" },
    { value: "main_admin", label: "Главный админ" },
    { value: "district_admin", label: "Админ района" }, // Добавлена новая роль
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Uirme</h1>
          <p className="text-muted-foreground">Система контроля посещаемости</p>
        </div>
        <Card className="border-2 border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Вход в систему</CardTitle>
            <CardDescription className="text-center">Введите ваши данные для входа</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold uppercase text-foreground">
                  Email адрес
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ваш Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 border-border bg-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold uppercase text-foreground">
                  Пароль
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ваш пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-2 border-border bg-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-bold uppercase text-foreground">
                  Роль
                </Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                  <SelectTrigger className="border-2 border-border bg-input">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border-2 border-destructive rounded-md">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-6 text-lg"
                disabled={loading}
              >
                {loading ? "Вход..." : "Войти"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}