"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getCurrentUser, getAllSchools } from "@/lib/database";
import Link from "next/link";

interface School {
  _id: string;
  name: string;
  city: string;
  created_at: Date;
}

interface User {
  _id: string;
  email: string;
  name: string;
  city: string;
  role: string;
}

export default function DistrictAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const currentUser = await getCurrentUser(token);
        if (currentUser.role !== "district_admin") {
          toast.error("Доступ запрещен");
          router.push("/login");
          return;
        }
        setUser(currentUser);

        const allSchools = await getAllSchools(token);
        const filteredSchools = allSchools.filter(
          (school: School) => school.city === currentUser.city
        );
        setSchools(filteredSchools);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Ошибка при загрузке данных");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Панель управления админа района {user?.city}
            </h1>
            <p className="text-muted-foreground">Просмотр школ в вашем районе</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Школы в районе {user?.city}</CardTitle>
          </CardHeader>
          <CardContent>
            {schools.length === 0 ? (
              <p className="text-muted-foreground">Нет школ в вашем районе.</p>
            ) : (
              <div className="grid gap-4">
                {schools.map((school) => (
                  <Card key={school._id}>
                    <CardHeader>
                      <CardTitle>{school.name} ({school.city})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <p>Создано: {new Date(school.created_at).toLocaleDateString("ru-RU")}</p>
                        {/* Убраны кнопки "Добавить школу", "Редактировать", "Назначить админа" */}
                        <Link href={`/schools/${school._id}`}>
                          <Button variant="default">Управлять</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">← Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}