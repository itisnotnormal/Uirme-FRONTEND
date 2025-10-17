// app/scanner/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock, LogOut } from "lucide-react";
import Link from "next/link";
import { QRScanner } from "@/components/qr-scanner";
import type { Event, AttendanceRecord } from "@/lib/types";
import { toast } from "sonner";
import { getActiveEvents, getAttendanceByEvent, getStudentByqr_code, addAttendanceRecord, checkAttendanceExists } from "@/lib/database";

export default function ScannerPage() {
  const router = useRouter();
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastScannedStudent, setLastScannedStudent] = useState<{ name: string; timestamp: string } | null>(null);

  const loadData = async (token: string) => {
    try {
      setLoading(true);
      const activeEvents = await getActiveEvents(token);
      setActiveEvents(activeEvents);

      if (activeEvents.length > 0 && !selectedEvent) {
        setSelectedEvent(activeEvents[0].id);
      }

      // Загружаем посещаемость для всех активных мероприятий
      const attendancePromises = activeEvents.map(async (event) => ({
        eventId: event.id,
        records: await getAttendanceByEvent(event.name, token),
      }));
      const attendanceData = await Promise.all(attendancePromises);
      const allRecords = attendanceData.flatMap(({ records }) => records);

      // Фильтруем записи только по текущей дате
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRecords = allRecords.filter(
        (record) => new Date(record.timestamp).toDateString() === today.toDateString()
      );
      setTodayAttendance(todayRecords);
    } catch (error: any) {
      console.error("Error loading data:", error.message, error.stack);
      toast.error("Ошибка при загрузке данных: " + (error.message || "Неизвестная ошибка"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadData(token);
  }, [router]);

  useEffect(() => {
    // Обновляем данные посещаемости при изменении selectedEvent
    const token = localStorage.getItem("token");
    if (token && selectedEvent) {
      const loadAttendance = async () => {
        try {
          const selectedEventObj = activeEvents.find((e) => e.id === selectedEvent);
          if (selectedEventObj) {
            const records = await getAttendanceByEvent(selectedEventObj.name, token);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRecords = records.filter(
              (record) => new Date(record.timestamp).toDateString() === today.toDateString()
            );
            setTodayAttendance(todayRecords);
          }
        } catch (error: any) {
          console.error("Error updating attendance:", error.message, error.stack);
          toast.error("Ошибка при обновлении посещаемости: " + (error.message || "Неизвестная ошибка"));
        }
      };
      loadAttendance();
    }
  }, [selectedEvent, activeEvents]);

  const handleScanSuccess = async (qrData: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    if (!selectedEvent) {
      toast.error("Пожалуйста, выберите мероприятие перед сканированием");
      return;
    }

    try {
      const selectedEventObj = activeEvents.find((e) => e.id === selectedEvent);
      if (!selectedEventObj) {
        throw new Error("Выбранное мероприятие не найдено");
      }

      const student = await getStudentByqr_code(qrData, token);
      if (!student) {
        throw new Error("Учащийся не найден по QR-коду");
      }

      const attendanceExists = await checkAttendanceExists(student.id, selectedEventObj.name, token);
      if (attendanceExists) {
        toast.error(`Посещение для ${student.name} уже отмечено для ${selectedEventObj.name}`);
        return;
      }

      const record: Omit<AttendanceRecord, "id"> = {
        student_id: student.id,
        event_name: selectedEventObj.name,
        timestamp: new Date(),
        scanned_by: "scanner",
        studentName: student.name,
      };
      const addedRecord = await addAttendanceRecord(record, token);
      toast.success(`Посещение отмечено для ${student.name} на ${selectedEventObj.name}`);

      // Обновляем todayAttendance, добавляя новую запись
      setTodayAttendance((prev) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = new Date(addedRecord!.timestamp).toDateString() === today.toDateString();
        if (addedRecord && isToday && addedRecord.event_name === selectedEventObj.name) {
          return [...prev.filter((r) => r.id !== addedRecord.id), addedRecord];
        }
        return prev;
      });
      setLastScannedStudent({ name: student.name, timestamp: new Date().toLocaleString("ru-RU") });
    } catch (error: any) {
      console.error("Scan error:", error.message, error.stack);
      const message = error.message.includes("unique_student_event")
        ? `Посещение для этого школьника уже отмечено для ${activeEvents.find((e) => e.id === selectedEvent)?.name || "мероприятия"}`
        : error.message.includes("Student not found")
        ? "Учащийся не найден по этому QR-коду"
        : error.message.includes("Invalid student_id")
        ? "Недействительный идентификатор школьника"
        : "Ошибка при обработке QR-кода";
      toast.error(message);
    }
  };

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
            <h1 className="text-3xl font-bold text-foreground mb-2">Сканер посещаемости</h1>
            <p className="text-muted-foreground">Отметьте посещение школьников сканированием QR-кодов</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Выберите мероприятие
            </CardTitle>
            <CardDescription>Выберите активное мероприятие для сканирования QR-кодов</CardDescription>
          </CardHeader>
          <CardContent>
            {activeEvents.length > 0 ? (
              <div className="space-y-4">
                <Select
                  value={selectedEvent || ""}
                  onValueChange={setSelectedEvent}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Выберите мероприятие" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} ({new Date(event.schedule[0]?.startTime || Date.now()).toLocaleString("ru-RU")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEvent && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {activeEvents.find((e) => e.id === selectedEvent)?.name}
                      </h3>
                      <Badge variant="default">Активно</Badge>
                    </div>
                    <p className="text-muted-foreground mb-2">
                      {activeEvents.find((e) => e.id === selectedEvent)?.description || "Нет описания"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(
                          activeEvents.find((e) => e.id === selectedEvent)?.schedule[0]?.startTime || Date.now()
                        ).toLocaleString("ru-RU")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Отмечено сегодня: {
                          todayAttendance.filter(
                            (r) => r.event_name === activeEvents.find((e) => e.id === selectedEvent)?.name
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Нет активных мероприятий. Пожалуйста, активируйте мероприятие на странице управления событиями.
                </p>
                <Link href="/events">
                  <Button variant="outline">Перейти к управлению мероприятиями</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedEvent && activeEvents.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Сканировать QR-код</CardTitle>
              <CardDescription>
                Сканируйте QR-код школьника для отметки посещения на мероприятии
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QRScanner
                onScanSuccess={handleScanSuccess}
                selectedEvent={activeEvents.find((e) => e.id === selectedEvent)}
              />
              {lastScannedStudent && (
                <div className="mt-4 p-4 border rounded-lg bg-muted">
                  <p className="font-medium">Последний сканированный ученик:</p>
                  <p className="text-foreground">{lastScannedStudent.name}</p>
                  <p className="text-sm text-muted-foreground">Дата посещения: {lastScannedStudent.timestamp}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {todayAttendance.length > 0 && selectedEvent && (
          <Card>
            <CardHeader>
              <CardTitle>Сегодняшние отметки</CardTitle>
              <CardDescription>Последние отмеченные школьники для выбранного мероприятия</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todayAttendance
                  .filter((record) => record.event_name === activeEvents.find((e) => e.id === selectedEvent)?.name)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 5)
                  .map((record, index) => (
                    <div key={record.id + index} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <div className="font-medium">{record.studentName}</div>
                        <div className="text-sm text-muted-foreground">{record.event_name}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleTimeString("ru-RU")}
                      </div>
                    </div>
                  ))}
              </div>
              {todayAttendance.filter(
                (r) => r.event_name === activeEvents.find((e) => e.id === selectedEvent)?.name
              ).length > 5 && (
                <div className="mt-4 text-center">
                  <Link href="/reports">
                    <Button variant="outline" size="sm">
                      Посмотреть все (
                      {todayAttendance.filter(
                        (r) => r.event_name === activeEvents.find((e) => e.id === selectedEvent)?.name
                      ).length}
                      )
                    </Button>
                  </Link>
                </div>
              )}
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