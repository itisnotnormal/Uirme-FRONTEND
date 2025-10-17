"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Users, QrCode } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import QRCode from "qrcode"; // Импортируем библиотеку qrcode
import { getCurrentUser, getSchoolById, getMyChildren } from "@/lib/database";
import type { School, Student, ParentProfile } from "@/lib/types";

export default function ParentProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [children, setChildren] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map()); // Для хранения QR-кодов детей

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
      if (user.role !== "parent") {
        toast.error("Доступ запрещён для этой роли");
        router.push("/");
        return;
      }
      setParent({
        id: user.id,
        email: user.email,
        role: user.role,
        school_id: user.school_id,
        name: user.name,
        createdAt: user.createdAt,
        children: user.children,
      });

      // Fetch school data
      if (user.school_id) {
        const schoolData = await getSchoolById(user.school_id, t);
        console.log("School data received:", schoolData);
        setSchool(schoolData);
      } else {
        console.warn("No school_id found for user");
      }

      // Fetch children data
      const childrenData = await getMyChildren(t);
      console.log("Children data received:", childrenData);
      setChildren(childrenData || []); // Ensure children is an array

      // Generate QR codes for each child using existing qr_code from database
      const qrCodePromises = childrenData.map(async (child) => {
        if (child.qr_code) {
          try {
            const url = await QRCode.toDataURL(child.qr_code, {
              width: 128, // Меньший размер для таблицы
              margin: 1,
              errorCorrectionLevel: "H",
            });
            return { childId: child.id, qrCodeURL: url };
          } catch (err) {
            console.error(`Error generating QR code for child ${child.id}:`, err);
            toast.error(`Ошибка генерации QR-кода для ${child.name}`);
            return { childId: child.id, qrCodeURL: "" };
          }
        }
        return { childId: child.id, qrCodeURL: "" };
      });

      const qrCodeData = await Promise.all(qrCodePromises);
      setQrCodes(new Map(qrCodeData.map(({ childId, qrCodeURL }) => [childId, qrCodeURL])));
    } catch (err: any) {
      console.error("Error fetching parent profile data:", {
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

  // Render nothing until useEffect determines the state
  if (!token || !parent) {
    return null; // Router.push will handle redirection in useEffect
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Профиль родителя</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Выйти
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Информация о родителе
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Имя:</strong> {parent.name}</p>
            <p><strong>Email:</strong> {parent.email}</p>
            <p><strong>Роль:</strong> Родитель</p>
            <p><strong>Школа:</strong> {school ? school.name : "Не удалось загрузить данные школы"}</p>
            <p><strong>Дата регистрации:</strong> {parent.createdAt.toLocaleDateString("ru-RU")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Дети
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Класс</TableHead>
                  <TableHead>Секция</TableHead>
                  <TableHead>Школа</TableHead>
                  <TableHead>QR-код</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.map((child) => (
                  <TableRow key={child.id || child._id}>
                    <TableCell>{child.name}</TableCell>
                    <TableCell>{child.group || "N/A"}</TableCell>
                    <TableCell>{child.specialty || "N/A"}</TableCell>
                    <TableCell>{school ? school.name : "Неизвестно"}</TableCell>
                    <TableCell>
                      {qrCodes.get(child.id) ? (
                        <img
                          src={qrCodes.get(child.id)}
                          alt={`QR-код для ${child.name}`}
                          className="w-16 h-16"
                        />
                      ) : (
                        <p className="text-muted-foreground">QR-код не доступен</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground">Нет зарегистрированных детей</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}