"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart3 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface AnalyticsData {
  totalUsers: number;
  usersByRole: {
    teachers: number;
    parents: number;
    students: number;
    schoolAdmins: { id: string; email: string; school: string | null }[];
    mainAdmins: number;
    districtAdmins: number;
  };
  totalSchools: number;
  totalStudents: number;
  totalEvents: number;
  totalAttendance: number;
  attendanceBySchool: { schoolName: string; count: number }[]; 
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";


export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchAnalytics(token);
  }, [router]);

  const fetchAnalytics = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      const data = await response.json();
      console.log(data)
      setAnalytics(data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      toast.error("Ошибка при загрузке аналитики");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Аналитика</h1>
            <p className="text-muted-foreground">Общая статистика системы</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Всего пользователей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Всего школ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalSchools}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Всего школьников</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalStudents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Всего мероприятий</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalEvents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Всего отметок</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalAttendance}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {analytics && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Пользователи по ролям</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Преподаватели: {analytics.usersByRole.teachers}</p>
                <p>Родители: {analytics.usersByRole.parents}</p>
                <p>Учащиеся: {analytics.usersByRole.students}</p>
                <p>Главные админы: {analytics.usersByRole.mainAdmins}</p>
                <p>Админы районов: {analytics.usersByRole.districtAdmins}</p>
                <p>Школьные админы:</p>
                <ul className="list-disc pl-6">
                  {analytics.usersByRole.schoolAdmins.map((admin) => (
                    <li key={admin.id}>
                      {admin.email} (Школа: {admin.school || "Не назначена"})
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {analytics && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Посещаемость по школам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.attendanceBySchool.map((school) => (
                  <p key={school.schoolName}>
                    {school.schoolName}: {school.count} отметок
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">← Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}