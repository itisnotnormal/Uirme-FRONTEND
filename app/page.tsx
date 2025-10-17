"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, QrCode, Calendar, BarChart3, FileSpreadsheet, Settings, LogOut, FileText } from "lucide-react";
import { AttendanceDashboard } from "@/components/attendance-dashboard";
import { getAllAttendanceRecords, getAllStudents, getAllEvents, getActiveEvent } from "@/lib/database";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const decoded: any = jwtDecode(token);
    setRole(decoded.role);

    if (!["school_admin", "main_admin", "district_admin", "teacher", "parent"].includes(decoded.role)) {
      router.push("/profile");
      return;
    }

    if (decoded.role === "teacher") {
      router.push("/profile/teacher");
      return;
    }

    if (decoded.role === "parent") {
      router.push("/profile/parent");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedAttendance, fetchedStudents, fetchedEvents, fetchedActiveEvent] = await Promise.all([
          getAllAttendanceRecords(token),
          getAllStudents(token),
          getAllEvents(token),
          getActiveEvent(token),
        ]);
        setAttendanceRecords(fetchedAttendance);
        setStudents(fetchedStudents);
        setEvents(fetchedEvents);
        setActiveEvent(fetchedActiveEvent);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Ошибка при загрузке данных: " + error.message);
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

  const todayAttendance = attendanceRecords.filter(
    (record) => record.timestamp.toDateString() === new Date().toDateString()
  );

  const attendanceRate =
    students.length > 0 && events.length > 0
      ? ((attendanceRecords.length / (students.length * events.length)) * 100).toFixed(2)
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {role === "district_admin" ? "Панель управления районом" : "Главная панель"}
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-600">Посещаемость сегодня</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{todayAttendance.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-600">Общая посещаемость</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{attendanceRate}%</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-600">Активное мероприятие</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{activeEvent ? 1 : 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Users className="h-5 w-5 text-blue-600" />
                Школы
              </CardTitle>
              <CardDescription className="text-gray-600">
                {role === "district_admin" ? "Управление школами района" : "Управление школами"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/schools">
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                >
                  Перейти к школам
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Аналитика
              </CardTitle>
              <CardDescription className="text-gray-600">
                {role === "district_admin" ? "Статистика по району" : "Статистика и метрики"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/analytics">
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                >
                  Посмотреть аналитику
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileText className="h-5 w-5 text-blue-600" />
                Отчеты
              </CardTitle>
              <CardDescription className="text-gray-600">
                {role === "district_admin" ? "Отчеты по району" : "Генерация и просмотр отчетов"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports">
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                >
                  Посмотреть отчеты
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Google Sheets
              </CardTitle>
              <CardDescription className="text-gray-600">
                {role === "district_admin" ? "Экспорт данных района" : "Экспорт данных в Google Sheets"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports">
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                >
                  Экспорт данных
                </Button>
              </Link>
            </CardContent>
          </Card>

          {role === "main_admin" && (
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Users className="h-5 w-5 text-blue-600" />
                  Управление админами районов
                </CardTitle>
                <CardDescription className="text-gray-600">Добавление и управление районными администраторами</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/district-admins">
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                  >
                    Управлять админами районов
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Settings className="h-5 w-5 text-blue-600" />
                Настройки системы
              </CardTitle>
              <CardDescription className="text-gray-600">Конфигурация и настройки приложения</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-gray-300 text-gray-400 bg-transparent" disabled>
                Скоро доступно
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Dashboard */}
        <div className="bg-white rounded-lg border p-6">
          <AttendanceDashboard
            attendanceRecords={attendanceRecords}
            students={students}
            events={events}
          />
        </div>
      </div>
    </div>
  );
}