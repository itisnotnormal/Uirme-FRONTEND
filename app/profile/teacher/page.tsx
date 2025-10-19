"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getCurrentUser, getEventsByTeacher, getAttendanceByEvent, getSchoolById } from "@/lib/database";
import type { Event, AttendanceRecord, School, TeacherProfile } from "@/lib/types";

export default function TeacherProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    console.log("Token:", t);
    if (!t) {
      toast.error("Токен не найден. Войдите в систему.");
      router.push("/login");
      return;
    }
    setToken(t);
    fetchData(t);
  }, [router]);

  const fetchData = async (t: string) => {
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Запрос превысил время ожидания");
      toast.error("Запрос превысил время ожидания");
    }, 10000);
    try {
      console.log("Starting fetchData...");
      // Fetch current user data
      const user = await getCurrentUser(t);
      console.log("User data received:", user);
      if (!user) {
        throw new Error("Не удалось получить данные пользователя");
      }
      if (user.role !== "teacher") {
        toast.error("Доступ запрещён для этой роли");
        router.push("/");
        return;
      }
      setTeacher({
        id: user.id,
        email: user.email,
        role: user.role,
        school_id: user.school_id,
        name: user.name,
        createdAt: user.createdAt,
      });

      // Fetch school data
      if (user.school_id) {
        const schoolData = await getSchoolById(user.school_id, t);
        console.log("School data received:", schoolData);
        setSchool(schoolData);
      } else {
        console.warn("No school_id found for user");
      }

      // Fetch events assigned to the teacher
      if (user.id) {
        const events = await getEventsByTeacher(user.id, t);
        setEvents(events);

        // Fetch attendance for each event
        const attendancePromises = events.map(async (event) => ({
          eventName: event.name,
          attendance: await getAttendanceByEvent(event.name, t),
        }));
        const attendanceData = await Promise.all(attendancePromises);
        const newAttendanceMap = new Map(attendanceData.map(({ eventName, attendance }) => [eventName, attendance]));
        setAttendanceMap(newAttendanceMap);
      }
    } catch (err: any) {
      console.error("Error fetching teacher profile data:", {
        message: err.message,
        token: t.slice(0, 10) + "...",
      });
      setError(err.message);
      toast.error(`Ошибка загрузки профиля: ${err.message}`);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      console.log("Fetch completed, loading set to false");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleRetry = () => {
    if (token) {
      fetchData(token);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={handleRetry} className="mt-4">
          Повторить
        </Button>
      </div>
    );
  }

  if (!teacher) {
    return <div className="text-center">Профиль не найден</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Профиль преподавателя</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Выйти
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Информация о преподавателе
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teacher.name && <p><strong>Имя:</strong> {teacher.name}</p>}
            <p><strong>Email:</strong> {teacher.email}</p>
            <p><strong>Роль:</strong> Преподаватель</p>
            <p><strong>Школа:</strong> {school ? school.name : "Не удалось загрузить данные школы"}</p>
            <p><strong>Дата регистрации:</strong> {teacher.createdAt.toLocaleDateString("ru-RU")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Назначенные мероприятия
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Посещаемость</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const attendanceRecords = attendanceMap.get(event.name) || [];
                  return (
                    <TableRow key={event.id}>
                      <TableCell>{event.name}</TableCell>
                      <TableCell>{event.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={event.is_active ? "success" : "secondary"}>
                          {event.is_active ? "Активно" : "Неактивно"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attendanceRecords.length} школьник(ов)
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground">Нет назначенных мероприятий</p>
          )}
        </CardContent>
      </Card>

      {events.map((event) => (
        <Card key={event.id} className="mt-6">
          <CardHeader>
            <CardTitle>Посещаемость: {event.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceMap.get(event.name)?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Учащийся</TableHead>
                    <TableHead>Время посещения</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceMap.get(event.name)?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell>{record.timestamp.toLocaleString("ru-RU")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Нет записей о посещаемости</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}