"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Calendar, QrCode } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import QRCode from "qrcode"; // Use qrcode library
import { getMyStudent, getMyChildren, getAttendanceByStudent, getEventsBySchool } from "@/lib/database";
import type { Student, AttendanceRecord, Event } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [children, setChildren] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [events, setEvents] = useState<Event[]>([]);
  const [qrCodeURL, setQrCodeURL] = useState<string>(""); // For student's QR code

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);
    try {
      const decoded: any = jwtDecode(t);
      setRole(decoded.role);
      fetchData(decoded.role, decoded.school_id, t);
    } catch (err) {
      console.error("Error decoding token:", err);
      router.push("/login");
    }
  }, [router]);

  const fetchData = async (userRole: string, schoolId: string, t: string) => {
    setLoading(true);
    try {
      if (userRole === "student") {
        const student = await getMyStudent(t);
        const att = await getAttendanceByStudent(student.id, t);
        const evts = await getEventsBySchool(schoolId, t);
        setStudentData(student);
        setAttendanceMap(new Map([[student.id, att]]));
        setEvents(evts.filter(evt => student.enrolled_events?.includes(evt.name)));

        // Generate QR code for student
        if (student.qr_code) {
          QRCode.toDataURL(student.qr_code, { width: 256, margin: 2, errorCorrectionLevel: "H" }, (err, url) => {
            if (err) {
              console.error("QR Code URL Error:", err);
              toast.error("Ошибка генерации QR-кода");
            } else {
              setQrCodeURL(url);
            }
          });
        }
      } else if (userRole === "parent") {
        const chldrn = await getMyChildren(t);
        setChildren(chldrn);
        const attPromises = chldrn.map(async (child) => ({
          childId: child.id,
          attendance: await getAttendanceByStudent(child.id, t),
        }));
        const attData = await Promise.all(attPromises);
        const newAttMap = new Map(attData.map(({ childId, attendance }) => [childId, attendance]));
        setAttendanceMap(newAttMap);
        const evts = await getEventsBySchool(schoolId, t);
        setEvents(evts);
      } else {
        toast.error("Доступ запрещён для этой роли");
        router.push("/");
      }
    } catch (err) {
      console.error("Error fetching profile data:", err);
      toast.error("Ошибка загрузки профиля");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;
  }

  if (role === "student" && studentData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Личный профиль</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Выйти
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Информация о школьнике
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Имя:</strong> {studentData.name}</p>
              <p><strong>Класс:</strong> {studentData.group}</p>
              <p><strong>Секция:</strong> {studentData.specialty}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Ваш QR-код
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {qrCodeURL ? (
                <img src={qrCodeURL} alt="QR Code" className="w-64 h-64" />
              ) : (
                <p className="text-muted-foreground">QR-код не сгенерирован</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ваши кружки/секции
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Статус посещения</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((evt) => {
                    const attended = attendanceMap.get(studentData.id)?.some(rec => rec.event_name === evt.name);
                    return (
                      <TableRow key={evt.id}>
                        <TableCell>{evt.name}</TableCell>
                        <TableCell>{evt.date.toLocaleDateString("ru-RU")}</TableCell>
                        <TableCell>
                          <Badge variant={attended ? "success" : "secondary"}>
                            {attended ? "Посещено" : "Не посещено"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground">Вы не записаны ни на одно мероприятие</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } else if (role === "parent" && children.length > 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Личный профиль</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Выйти
          </Button>
        </div>

        {children.map((child) => (
          <Card key={child.id} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {child.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p><strong>Класс:</strong> {child.group}</p>
                <p><strong>Секция:</strong> {child.specialty}</p>

                <h3 className="font-semibold mt-4">Посещаемость мероприятий</h3>
                {events.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Мероприятие</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Время посещения</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((evt) => {
                        const record = attendanceMap.get(child.id)?.find(rec => rec.event_name === evt.name);
                        return (
                          <TableRow key={`${child.id}-${evt.id}`}>
                            <TableCell>{evt.name}</TableCell>
                            <TableCell>{evt.date.toLocaleDateString("ru-RU")}</TableCell>
                            <TableCell>
                              <Badge variant={record ? "success" : "secondary"}>
                                {record ? "Посещено" : "Не посещено"}
                              </Badge>
                            </TableCell>
                            <TableCell>{record ? record.timestamp.toLocaleString("ru-RU") : "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">Нет мероприятий</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {children.length === 0 && (
          <p className="text-center text-muted-foreground">Нет привязанных детей</p>
        )}
      </div>
    );
  } else {
    return <div className="text-center">Профиль не найден</div>;
  }
}