"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, BarChart3, Users, Calendar } from "lucide-react";
import { getAllAttendanceRecords, getAllStudents, getAllEvents, getAllUsers, getAllSchools, getActiveEvent } from "@/lib/database";
import Link from "next/link";
import type { AttendanceRecord, Student, Event, User, School } from "@/lib/types";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "week" | "month" | "year">("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedAttendance, fetchedStudents, fetchedEvents, fetchedUsers, fetchedSchools, fetchedActiveEvent] = await Promise.all([
          getAllAttendanceRecords(token),
          getAllStudents(token),
          getAllEvents(token),
          getAllUsers(token),
          getAllSchools(token),
          getActiveEvent(token),
        ]);
        setAttendanceRecords(fetchedAttendance);
        setStudents(fetchedStudents);
        setEvents(fetchedEvents);
        setUsers(fetchedUsers);
        setSchools(fetchedSchools);
        setActiveEvents(fetchedEvents.filter((e) => e.is_active));
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить данные: " + error.message,
          variant: "destructive",
        });
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

  // Compute filtered data
  let filteredStudents = students;
  let filteredEvents = events;
  let filteredAttendance = attendanceRecords;
  let filteredUsers = users;
  const effectiveSchoolId = selectedSchoolId !== "all" ? selectedSchoolId : null;

  if (effectiveSchoolId) {
    filteredStudents = students.filter((s) => s.school_id === effectiveSchoolId);
    filteredEvents = events.filter((e) => e.school_id === effectiveSchoolId);
    filteredAttendance = attendanceRecords.filter((a) =>
      filteredStudents.some((s) => s.id === a.student_id)
    );
    filteredUsers = users.filter((u) => u.school_id === effectiveSchoolId);
  }

  if (selectedPeriod !== "all") {
    let days = 0;
    switch (selectedPeriod) {
      case "week":
        days = 7;
        break;
      case "month":
        days = 30;
        break;
      case "year":
        days = 365;
        break;
    }
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    filteredAttendance = filteredAttendance.filter((record) => record.timestamp >= startDate);
  }

  const todayAttendance = filteredAttendance.filter(
    (record) => record.timestamp.toDateString() === new Date().toDateString()
  );

  const attendanceByEvent = filteredEvents.map((event) => ({
    event,
    count: filteredAttendance.filter((record) => record.event_name === event.name).length,
  }));

  const schoolAdmins = filteredUsers.filter((u) => u.role === "school_admin");
  const teachers = filteredUsers.filter((u) => u.role === "teacher");
  const parents = filteredUsers.filter((u) => u.role === "parent");

  const totalAttendance = filteredAttendance.length;
  const totalPossible = filteredStudents.length * activeEvents.length;
  const overallAttendance = totalPossible > 0 ? ((totalAttendance / totalPossible) * 100).toFixed(2) : "0";

  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  const handleExcelExport = () => {
    const teacherMap = new Map(teachers.map((t) => [t.id, t.name || t.email]));

    // Prepare the main data for the desired structure
    const mainData = [];
    const filteredSchools = effectiveSchoolId ? schools.filter((s) => s.id === effectiveSchoolId) : schools;
    filteredSchools.forEach((school) => {
      const schoolEvents = filteredEvents.filter((e) => e.school_id === school.id);
      schoolEvents.forEach((event) => {
        const trainer = teacherMap.get(event.teacher_id) || "Неизвестно";
        const attendanceCount = filteredAttendance.filter((a) => a.event_name === event.name).length;
        mainData.push({
          Школа: school.name,
          Мероприятие: event.name,
          Тренер: trainer,
          "Кол-во детей": attendanceCount,
          Период: selectedPeriod === "all" ? "Весь период" : selectedPeriod === "week" ? "Неделя" : selectedPeriod === "month" ? "Месяц" : "Год",
        });
      });
    });

    const wb = XLSX.utils.book_new();

    // Main sheet with desired structure
    const wsMain = XLSX.utils.json_to_sheet(mainData);
    XLSX.utils.book_append_sheet(wb, wsMain, "Основной Отчет");

    // Summary sheet
    const summaryData = [
      ["Категория", "Количество"],
      ["Админы школ", schoolAdmins.length],
      ["Преподаватели", teachers.length],
      ["Родители", parents.length],
      ["Школьники", filteredStudents.length],
      ["Активные события", activeEvents.length],
      ["Отметки", totalAttendance],
      ["Общая посещаемость %", overallAttendance],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Сводка");

    // School Admins sheet
    const adminsData = schoolAdmins.map((u) => ({
      ID: u.id,
      Email: u.email,
      Name: u.name,
      School: u.school?.name || schoolMap.get(u.school_id || "") || "",
      Created: u.createdAt.toLocaleDateString("ru-RU"),
    }));
    const wsAdmins = XLSX.utils.json_to_sheet(adminsData);
    XLSX.utils.book_append_sheet(wb, wsAdmins, "Админы школ");

    // Teachers sheet
    const teachersData = teachers.map((u) => ({
      ID: u.id,
      Email: u.email,
      Name: u.name,
      School: u.school?.name || schoolMap.get(u.school_id || "") || "",
      Created: u.createdAt.toLocaleDateString("ru-RU"),
    }));
    const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
    XLSX.utils.book_append_sheet(wb, wsTeachers, "Преподаватели");

    // Parents sheet
    const parentsData = parents.map((u) => ({
      ID: u.id,
      Email: u.email,
      Name: u.name,
      School: u.school?.name || schoolMap.get(u.school_id || "") || "",
      Children: u.children?.map((id: string) => filteredStudents.find((s) => s.id === id)?.name || id).join(", ") || "",
      Created: u.createdAt.toLocaleDateString("ru-RU"),
    }));
    const wsParents = XLSX.utils.json_to_sheet(parentsData);
    XLSX.utils.book_append_sheet(wb, wsParents, "Родители");

    // Students sheet
    const studentsData = filteredStudents.map((s) => ({
      ID: s.id,
      Name: s.name,
      Group: s.group,
      Specialty: s.specialty,
      QR_Code: s.qr_code,
      School: schoolMap.get(s.school_id) || "",
      Parents: parents.filter((p) => p.children?.includes(s.id)).map((p) => p.name || p.email).join(", ") || "",
      Created: s.createdAt.toLocaleDateString("ru-RU"),
    }));
    const wsStudents = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(wb, wsStudents, "Школьники");

    // Active Events sheet
    const eventsData = activeEvents.map((e) => ({
      ID: e.id,
      Name: e.name,
      Description: e.description || "",
      Schedule: e.schedule.map((sc) => `${sc.dayOfWeek} ${sc.startTime}-${sc.endTime}`).join("; "),
      School: schoolMap.get(e.school_id) || "",
      Teacher: teacherMap.get(e.teacher_id) || "",
    }));
    const wsEvents = XLSX.utils.json_to_sheet(eventsData);
    XLSX.utils.book_append_sheet(wb, wsEvents, "Активные события");

    // Attendance Records sheet
    const attendanceData = filteredAttendance.map((a) => ({
      ID: a.id,
      Student_ID: a.student_id,
      Student_Name: a.studentName,
      Event_Name: a.event_name,
      Timestamp: a.timestamp.toLocaleString("ru-RU"),
      Scanned_By: a.scanned_by,
      Trainer: teacherMap.get(events.find((e) => e.name === a.event_name)?.teacher_id || "") || "",
      Parents: parents.filter((p) => p.children?.includes(a.student_id)).map((p) => p.name || p.email).join(", ") || "",
      Location: a.location ? `${a.location.lat}, ${a.location.lng}` : "Нет данных",
    }));
    const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Отметки");

    XLSX.writeFile(wb, "reports.xlsx");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Отчеты и экспорт</h1>
            <p className="text-muted-foreground">Просматривайте статистику посещаемости и экспортируйте данные</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div>
            <Label htmlFor="school">Школа</Label>
            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите школу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все школы</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="period">Период</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Весь период</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="year">Год</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium truncate">Всего учеников</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold text-primary">{filteredStudents.length}</div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium truncate">Всего мероприятий</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold text-primary">{filteredEvents.length}</div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium truncate">Всего отметок</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold text-primary">{filteredAttendance.length}</div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium truncate">Сегодня отметок</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold text-primary">{todayAttendance.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Excel Export */}
        <div className="mb-8">
          <Button onClick={handleExcelExport}>Экспорт в Excel</Button>
        </div>

        {/* Attendance by Event */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Посещаемость по мероприятиям</CardTitle>
            <CardDescription>Статистика посещений для каждого мероприятия</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEvents.length > 0 ? (
              <div className="space-y-3">
                {attendanceByEvent.map(({ event, count }) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{event.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {event.is_active && <Badge variant="default">Активно</Badge>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-semibold text-primary">{count}</div>
                      <div className="text-xs text-muted-foreground">посещений</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">Нет мероприятий</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Последние отметки</CardTitle>
            <CardDescription>Недавние записи посещаемости</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAttendance.length > 0 ? (
              <div className="space-y-2">
                {filteredAttendance
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .slice(0, 10)
                  .map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{record.studentName}</div>
                        <div className="text-sm text-muted-foreground truncate">{record.event_name}</div>
                      </div>
                      <div className="text-sm text-muted-foreground flex-shrink-0">
                        {record.timestamp.toLocaleString("ru-RU")}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Пока нет записей о посещаемости</div>
            )}
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">← Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}