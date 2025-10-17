"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Plus, Edit, Trash2, LogOut, Users, User, Calendar, QrCode, UserCog } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  getUsersBySchoolAndRole,
  addUser,
  updateUser,
  deleteUser,
  getStudentsBySchool,
  addStudent,
  updateStudent,
  deleteStudent,
  deleteEvent,
  getEventsBySchool,
  addEvent,
  updateEvent,
  toggleEventActive,
  addChildToParent,
  getSchoolById,
  getAttendanceByEvent,
  deleteAttendanceRecord,
  deleteAllAttendanceByEvent,
  removeChildFromParent, // Добавлено
} from "@/lib/database";
import type { Student, School, Event, AttendanceRecord, User } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Схема валидации для школьника
const studentSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  group: z.string().min(1, "Класс обязателен"),
  specialty: z.string().min(1, "Секция обязательна"),
  email: z.string().email("Неверный email").min(1, "Email обязателен"),
  password: z.string().min(8, "Пароль минимум 8 символов"),
  qr_code: z.string().min(1, "QR-код обязателен"),
});

type StudentFormData = z.infer<typeof studentSchema>;

// Схема валидации для события
const eventSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  schedule: z.array(
    z.object({
      dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], {
        errorMap: () => ({ message: "Выберите день недели" }),
      }),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Неверный формат времени"),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Неверный формат времени"),
    })
  ).min(1, "Добавьте хотя бы одно расписание"),
  description: z.string().optional(),
  teacher_id: z.string().min(1, "Преподаватель обязателен"),
});

type EventFormData = z.infer<typeof eventSchema>;

interface UserForSchool {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  name?: string;
}

interface SchoolDetail {
  id: string;
  name: string;
}

const userSchema = z.object({
  email: z.string().email("Неверный email").min(1, "Email обязателен"),
  password: z.string().min(8, "Пароль минимум 8 символов").optional(),
  name: z.string().min(1, "Имя обязательно для этой роли"),
});

type UserFormData = z.infer<typeof userSchema>;

// Цвета для дней недели
const dayColors: { [key: string]: string } = {
  Monday: "bg-blue-100 text-blue-800",
  Tuesday: "bg-green-100 text-green-800",
  Wednesday: "bg-yellow-100 text-yellow-800",
  Thursday: "bg-purple-100 text-purple-800",
  Friday: "bg-pink-100 text-pink-800",
  Saturday: "bg-orange-100 text-orange-800",
  Sunday: "bg-red-100 text-red-800",
};

// Компонент для списка пользователей (админы/родители/преподаватели)
function UsersTab({ schoolId, role }: { schoolId: string; role: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<User | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [search, setSearch] = useState("");

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    if (t) {
      fetchUsers(t);
      if (role === "parent") fetchStudents(t);
    }
  }, [schoolId, role]);

  const fetchUsers = async (t: string) => {
    try {
      const data = await getUsersBySchoolAndRole(schoolId, role, t);
      setUsers(data);
    } catch (err) {
      console.error(`Error fetching ${role}:`, err);
      toast.error(`Ошибка загрузки ${role === 'teacher' ? 'преподавателей' : role === 'parent' ? 'родителей' : 'админов'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (t: string) => {
    try {
      const data = await getStudentsBySchool(schoolId, t);
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
      toast.error("Ошибка загрузки школьников");
    }
  };

  const handleCreateOrUpdateUser = async (data: UserFormData) => {
    if (!token) return;
    try {
      if (editingUser) {
        // Update user
        const updateData: { email?: string; password?: string; name?: string } = {
          email: data.email,
          name: data.name,
        };
        if (data.password) {
          updateData.password = data.password;
        }
        await updateUser(editingUser.id, updateData, token);
        toast.success("Пользователь обновлён");
        setIsEditDialogOpen(false);
        setEditingUser(null);
      } else {
        // Create user
        await addUser({ email: data.email, password: data.password!, role, school_id: schoolId, name: data.name }, token);
        toast.success("Пользователь создан");
        setIsAddDialogOpen(false);
      }
      form.reset();
      await fetchUsers(token);
    } catch (err: any) {
      console.error("Error saving user:", err);
      if (err.message.includes("User already exists")) {
        toast.error("Пользователь с таким email уже существует");
      } else {
        toast.error(editingUser ? "Ошибка обновления пользователя" : "Ошибка создания пользователя");
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!token) return;
    try {
      await deleteUser(id, token);
      await fetchUsers(token);
      toast.success("Пользователь удалён");
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Ошибка удаления");
    }
  };

  const handleAddChild = async () => {
    if (!token || !selectedParent || !selectedStudentId) return;
    try {
      await addChildToParent(selectedParent.id, selectedStudentId, token);
      toast.success("Ребёнок успешно добавлен к родителю");
      setIsAddChildDialogOpen(false);
      setSelectedStudentId("");
      await fetchUsers(token);
    } catch (err) {
      console.error("Error adding child:", err);
      toast.error("Ошибка при добавлении ребёнка");
    }
  };

  const handleRemoveChild = async (parentId: string, childId: string) => {
    if (!token) return;
    if (!confirm("Вы уверены, что хотите удалить ребёнка от родителя?")) return;
    try {
      await removeChildFromParent(parentId, childId, token);
      toast.success("Ребёнок удалён от родителя");
      await fetchUsers(token);
    } catch (err) {
      console.error("Error removing child:", err);
      toast.error("Ошибка при удалении ребёнка");
    }
  };

  const roleIcon = role === 'school_admin' ? UserCog : role === 'teacher' ? QrCode : Users;

  const isPlainPassword = ['teacher', 'parent'].includes(role);

  if (loading) return <div>Загрузка...</div>;

  const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Список {role === 'teacher' ? 'преподавателей' : role === 'parent' ? 'родителей' : 'админов школы'}
        </h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить {role === 'teacher' ? 'Преподавателя' : role === 'parent' ? 'Родителя' : 'Админа школы'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleCreateOrUpdateUser)} className="space-y-4">
              <div>
                <Label htmlFor="name">ФИО</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" {...form.register("email")} />
                {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type={isPlainPassword ? "text" : "password"} {...form.register("password")} />
                {form.formState.errors.password && <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>}
              </div>
              <Button type="submit">Создать</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Input
        placeholder="Поиск по ФИО или email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {user.name ? `${user.name} (${user.email})` : user.email}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Создан: {user.createdAt.toLocaleDateString("ru-RU")}</p>
              {role === "parent" && (
                <div className="mt-2">
                  <p className="font-semibold">Дети:</p>
                  {user.children && user.children.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {user.children.map((childId) => {
                        const child = students.find((s) => s.id === childId);
                        return (
                          <li key={childId} className="flex items-center justify-between">
                            {child ? `${child.name} (${child.group})` : "Неизвестный школьник"}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveChild(user.id, childId)}
                            >
                              Удалить
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>Нет привязанных детей</p>
                  )}
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setSelectedParent(user);
                      setIsAddChildDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Добавить ребёнка
                  </Button>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingUser(user);
                        form.reset({
                          email: user.email,
                          name: user.name || "",
                          password: user.password || "",
                        });
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Редактировать
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Редактировать {role === 'teacher' ? 'Преподавателя' : role === 'parent' ? 'Родителя' : 'Админа школы'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreateOrUpdateUser)} className="space-y-4">
                      <div>
                        <Label htmlFor="name">ФИО</Label>
                        <Input id="name" {...form.register("name")} />
                        {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" {...form.register("email")} />
                        {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="password">Новый пароль (оставьте пустым, чтобы не менять)</Label>
                        <Input id="password" type={isPlainPassword ? "text" : "password"} {...form.register("password")} />
                        {form.formState.errors.password && <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>}
                      </div>
                      <Button type="submit">Сохранить</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ребёнка к {selectedParent?.email}</DialogTitle>
            <DialogDescription>Выберите школьника для привязки к родителю.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Школьник</Label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите школьника" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.group})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddChild} disabled={!selectedStudentId}>
              Добавить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Компонент для школьников
function StudentsTab({ schoolId }: { schoolId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [qrCodeURL, setQrCodeURL] = useState<string>("");
  const [qrError, setQrError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      group: "",
      specialty: "",
      email: "",
      password: "",
      qr_code: "",
    },
  });

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    if (t) loadStudents(t);
  }, [schoolId]);

  const loadStudents = async (t: string) => {
    try {
      setLoading(true);
      const data = await getStudentsBySchool(schoolId, t);
      setStudents(data);
    } catch (error: any) {
      console.error("Error loading students:", error);
      toast.error("Ошибка при загрузке школьников: " + (error.message || "Неизвестная ошибка"));
    } finally {
      setLoading(false);
    }
  };

  // In StudentsTab component, update the form.reset in useEffect to include email from editingStudent
  useEffect(() => {
    if (editingStudent) {
      form.reset({
        name: editingStudent.name,
        group: editingStudent.group,
        specialty: editingStudent.specialty,
        email: editingStudent.email || "",  // Use populated email if available
        password: editingStudent.password || "",  // Use populated password if available
        qr_code: editingStudent.qr_code,
      });
    } else {
      const newQrCode = crypto.randomUUID();
      form.reset({
        name: "",
        group: "",
        specialty: "",
        email: "",
        password: "",
        qr_code: newQrCode,
      });
    }
  }, [editingStudent, form]);

  useEffect(() => {
    if (isAddOpen && form.watch("qr_code")) {
      setQrError(null);
      QRCode.toDataURL(form.watch("qr_code"), { width: 256, margin: 2, errorCorrectionLevel: "H" }, (err, url) => {
        if (err) {
          console.error("QR Code URL Error:", err);
          setQrError("Ошибка генерации QR-кода");
          setQrCodeURL("");
        } else {
          setQrCodeURL(url);
        }
      });
    } else {
      setQrCodeURL("");
      setQrError(null);
    }
  }, [isAddOpen, form.watch("qr_code")]);

  const onSubmit = async (data: StudentFormData) => {
    if (!token) {
      toast.error("Токен не найден. Войдите в систему.");
      return;
    }
    console.log("Submitting student data:", data);

    try {
      const studentData: Partial<Omit<Student, "id" | "createdAt">> & { email?: string; password?: string } = {
        name: data.name,
        group: data.group,
        specialty: data.specialty,
        school_id: schoolId,
      };
      // Добавляем email и password только если они заполнены
      if (data.email) studentData.email = data.email;
      if (data.password) studentData.password = data.password;

      let updatedStudent: Student | null = null;
      if (editingStudent) {
        updatedStudent = await updateStudent(editingStudent.id, studentData, token);
        toast.success(`Учащийся ${data.name} успешно обновлен`);
      } else {
        studentData.qr_code = data.qr_code;
        updatedStudent = await addStudent(studentData as Omit<Student, "id" | "createdAt"> & { email: string; password: string }, token);
        toast.success(`Учащийся ${data.name} успешно добавлен`);
      }
      setIsAddOpen(false);
      setEditingStudent(null);
      form.reset({
        name: "",
        group: "",
        specialty: "",
        email: "",
        password: "",
        qr_code: crypto.randomUUID(),
      });
      setQrCodeURL("");
      await loadStudents(token);
    } catch (error: any) {
      console.error("Error saving student:", error);
      if (error.message.includes("User already exists") || error.message.includes("Email already exists")) {
        toast.error("Пользователь с таким email уже существует");
      } else {
        toast.error("Ошибка при сохранении школьника: " + (error.message || "Неизвестная ошибка"));
      }
    }
  };

  const handleDelete = async () => {
    if (!token || !deletingStudent) return;
    try {
      const success = await deleteStudent(deletingStudent.id, token);
      if (success) {
        toast.success(`Учащийся ${deletingStudent.name} успешно удален`);
        setDeletingStudent(null);
        await loadStudents(token);
      } else {
        throw new Error("Failed to delete student");
      }
    } catch (error: any) {
      console.error("Error deleting student:", error);
      toast.error("Ошибка при удалении школьника: " + (error.message || "Неизвестная ошибка"));
    }
  };

  if (loading) return <div>Загрузка школьников...</div>;

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Управление школьниками</h2>
            <p className="text-gray-600">Добавляйте, редактируйте и управляйте школьниками</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить школьника
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStudent ? "Редактировать школьника" : "Добавить школьника"}</DialogTitle>
                  <DialogDescription>
                    Заполните информацию о школьнике.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="name">ФИО</Label>
                    <Input id="name" {...form.register("name")} />
                    {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="group">Класс</Label>
                    <Input id="group" {...form.register("group")} />
                    {form.formState.errors.group && <p className="text-red-500 text-sm">{form.formState.errors.group.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="specialty">Секция</Label>
                    <Input id="specialty" {...form.register("specialty")} />
                    {form.formState.errors.specialty && <p className="text-red-500 text-sm">{form.formState.errors.specialty.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...form.register("email")} />
                    {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="password">Пароль</Label>
                    <Input id="password" type="text" {...form.register("password")} />
                    {form.formState.errors.password && <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">{editingStudent ? "Сохранить" : "Добавить"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Input
        placeholder="Поиск по ФИО"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <div className="grid gap-4">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <Card key={student.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-sm">
                        {student.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                          {student.group}
                        </Badge>
                        <span className="text-sm text-gray-500 truncate">QR: {student.qr_code || "Не установлен"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                      onClick={() => {
                        setEditingStudent(student);
                        setIsAddOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                          onClick={() => setDeletingStudent(student)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить школьника {deletingStudent?.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>Нет школьников для отображения</p>
        )}
      </div>

      {filteredStudents.length === 0 && !loading && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <div className="text-gray-500 mb-4">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет школьников</h3>
              <p className="text-gray-600">Добавьте первого школьника для начала работы</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить школьника
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Компонент для мероприятий
function EventsTab({ schoolId }: { schoolId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      schedule: [{ dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00" }],
      description: "",
      teacher_id: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "schedule",
  });

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    if (t) {
      loadEvents(t);
      loadTeachers(t);
    }
  }, [schoolId]);

  const loadTeachers = async (t: string) => {
    try {
      const fetchedTeachers = await getUsersBySchoolAndRole(schoolId, "teacher", t);
      setTeachers(fetchedTeachers);
    } catch (error: any) {
      console.error("Error loading teachers:", error);
      toast.error("Ошибка при загрузке преподавателей");
    }
  };

  const loadEvents = async (t: string) => {
    try {
      setLoading(true);
      const fetchedEvents = await getEventsBySchool(schoolId, t);
      const attendancePromises = fetchedEvents.map(async (event) => ({
        eventName: event.name,
        attendance: await getAttendanceByEvent(event.name, t, schoolId),
      }));
      const attendanceData = await Promise.all(attendancePromises);
      const newAttendanceMap = new Map(attendanceData.map(({ eventName, attendance }) => [eventName, attendance]));
      console.log("New attendance map:", fetchedEvents);
      setEvents(fetchedEvents);
      setAttendanceMap(newAttendanceMap);
    } catch (error: any) {
      console.error("Error loading events:", error);
      toast.error("Ошибка при загрузке мероприятий");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editingEvent) {
      form.reset({
        name: editingEvent.name,
        schedule: editingEvent.schedule,
        description: editingEvent.description || "",
        teacher_id: editingEvent.teacher_id || "",
      });
    } else {
      form.reset({
        name: "",
        schedule: [{ dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00" }],
        description: "",
        teacher_id: teachers.length > 0 ? teachers[0].id : "",
      });
    }
  }, [editingEvent, teachers, form]);

  const onSubmit = async (data: EventFormData) => {
  if (!token) {
    toast.error("Токен не найден. Войдите в систему.");
    return;
  }
  try {
    // Trim the event name to remove leading/trailing spaces
    const trimmedData = {
      ...data,
      name: data.name.trim(),
    };

    // Проверяем, существует ли мероприятие с таким же названием
    const existingEvents = await getEventsBySchool(schoolId, token);
    const eventExists = existingEvents.some(
      (event) =>
        event.name.toLowerCase() === trimmedData.name.toLowerCase() &&
        // Исключаем текущее мероприятие при редактировании
        (!editingEvent || event.id !== editingEvent.id)
    );

    if (eventExists) {
      toast.error("Мероприятие с таким названием уже существует в этой школе");
      return;
    }

    const eventData = {
      ...trimmedData,
      is_active: editingEvent ? editingEvent.is_active : false,
      school_id: schoolId,
    };
    console.log("Submitting event data:", eventData);
    let updatedEvent: Event | null = null;
    if (editingEvent) {
      updatedEvent = await updateEvent(editingEvent.id, eventData, token);
      if (updatedEvent) {
        toast.success(`Мероприятие "${trimmedData.name}" успешно обновлено`);
      } else {
        throw new Error("Failed to update event");
      }
    } else {
      updatedEvent = await addEvent(eventData as Omit<Event, "id">, token);
      if (updatedEvent) {
        toast.success(`Мероприятие "${trimmedData.name}" успешно добавлено`);
        console.log("Added event response:", updatedEvent);
      } else {
        throw new Error("Failed to add event");
      }
    }
    setIsAddOpen(false);
    setEditingEvent(null);
    form.reset({
      name: "",
      schedule: [{ dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00" }],
      description: "",
      teacher_id: teachers.length > 0 ? teachers[0].id : "",
    });
    await loadEvents(token);
  } catch (error: any) {
    console.error("Error saving event:", error);
    toast.error("Ошибка при сохранении мероприятия: " + (error.message || "Неизвестная ошибка"));
  }
};

  const handleToggleActive = async (eventId: string, currentActive: boolean, eventName: string) => {
    if (!token) {
      toast.error("Токен не найден. Войдите в систему.");
      return;
    }
    console.log(`Attempting to toggle event ${eventId} to ${!currentActive}, eventName: ${eventName}`);
    if (!eventId || eventId === "undefined") {
      console.error("Invalid eventId:", eventId);
      toast({
        title: "Ошибка",
        description: "Недействительный ID мероприятия",
        variant: "destructive",
      });
      return;
    }
    try {
      if (currentActive) {
        // Deactivating event: delete all attendance records
        const success = await deleteAllAttendanceByEvent(eventName, token);
        if (success) {
          setAttendanceMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(eventName, []);
            return newMap;
          });
          toast({
            title: "Успех",
            description: "Все записи посещаемости удалены",
          });
        } else {
          throw new Error("Failed to delete attendance records");
        }
      }
      const success = await toggleEventActive(eventId, !currentActive, token);
      console.log("toggleEventActive result:", success);
      if (success) {
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId ? { ...event, is_active: !currentActive } : event
          )
        );
        toast({
          title: "Успех",
          description: `Мероприятие ${currentActive ? "деактивировано" : "активировано"}`,
        });
      } else {
        throw new Error("Failed to toggle event active status");
      }
    } catch (error: any) {
      console.error("Error in handleToggleActive:", error);
      toast({
        title: "Ошибка",
        description: `Произошла ошибка при ${currentActive ? "деактивации" : "активации"} мероприятия: ${error.message || "Неизвестная ошибка"}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!token || !deletingEvent) return;
    try {
      const success = await deleteEvent(deletingEvent.id, token);
      if (success) {
        toast.success(`Мероприятие "${deletingEvent.name}" успешно удалено`);
        setDeletingEvent(null);
        await loadEvents(token);
      } else {
        throw new Error("Failed to delete event");
      }
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Ошибка при удалении мероприятия: " + (error.message || "Неизвестная ошибка"));
    }
  };

  const handleDeleteAttendance = async (recordId: string, eventName: string) => {
    if (!token) return;
    try {
      const success = await deleteAttendanceRecord(recordId, token);
      if (success) {
        setAttendanceMap((prev) => {
          const newMap = new Map(prev);
          const updatedAttendance = newMap.get(eventName)?.filter((record) => record.id !== recordId) || [];
          newMap.set(eventName, updatedAttendance);
          return newMap;
        });
        toast.success("Запись о посещении удалена");
      } else {
        throw new Error("Failed to delete attendance record");
      }
    } catch (error: any) {
      console.error("Error deleting attendance:", error);
      toast.error(`Произошла ошибка при удалении записи: ${error.message || "Неизвестная ошибка"}`);
    }
  };

  const openDetailsDialog = (event: Event) => {
    console.log("Opening details for event:", event);
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  const dayNamesRu: { [key: string]: string } = {
    Monday: "Понедельник",
    Tuesday: "Вторник",
    Wednesday: "Среда",
    Thursday: "Четверг",
    Friday: "Пятница",
    Saturday: "Суббота",
    Sunday: "Воскресенье",
  };

  if (loading) return <div>Загрузка мероприятий...</div>;

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Управление мероприятиями</h2>
            <p className="text-gray-600">Добавляйте и управляйте мероприятиями школы</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить мероприятие
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingEvent ? "Редактировать мероприятие" : "Добавить мероприятие"}</DialogTitle>
                  <DialogDescription>
                    Заполните информацию о мероприятии и его расписании.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название</Label>
                    <Input id="name" {...form.register("name")} />
                    {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <Label>Расписание</Label>
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2 mt-2">
                        <Select
                          {...form.register(`schedule.${index}.dayOfWeek`)}
                          onValueChange={(value) => form.setValue(`schedule.${index}.dayOfWeek`, value)}
                          defaultValue={field.dayOfWeek}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="День недели" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(dayNamesRu).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          {...form.register(`schedule.${index}.startTime`)}
                          className="w-[100px]"
                        />
                        <Input
                          type="time"
                          {...form.register(`schedule.${index}.endTime`)}
                          className="w-[100px]"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {form.formState.errors.schedule && (
                      <p className="text-red-500 text-sm">{form.formState.errors.schedule.message}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => append({ dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00" })}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Добавить время
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Input id="description" {...form.register("description")} placeholder="Опционально" />
                  </div>
                  <div>
                    <Label htmlFor="teacher_id">Преподаватель</Label>
                    <Select
                      value={form.watch("teacher_id") || ""}
                      onValueChange={(value) => form.setValue("teacher_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.teacher_id && <p className="text-red-500 text-sm">{form.formState.errors.teacher_id.message}</p>}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">{editingEvent ? "Сохранить" : "Добавить"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Input
        placeholder="Поиск по названию мероприятия"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <div className="grid gap-4">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <Card
              key={event.id}
              className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openDetailsDialog(event)}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{event.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {event.schedule.map((sched, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className={`${dayColors[sched.dayOfWeek]} hover:bg-opacity-80`}
                          >
                            {dayNamesRu[sched.dayOfWeek]} {sched.startTime}-{sched.endTime}
                          </Badge>
                        ))}
                        {event.description && (
                          <span className="text-sm text-gray-500 truncate max-w-[200px]">{event.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={event.is_active}
                      onCheckedChange={() => handleToggleActive(event.id, event.is_active, event.name)}
                      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                    />
                    <Badge variant={event.is_active ? "default" : "secondary"}>
                      {event.is_active ? "Активно" : "Неактивно"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                      onClick={() => {
                        setEditingEvent(event);
                        setIsAddOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                          onClick={() => setDeletingEvent(event)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить мероприятие "{deletingEvent?.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>Нет мероприятий для отображения</p>
        )}
      </div>

      {filteredEvents.length === 0 && !loading && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <div className="text-gray-500 mb-4">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет мероприятий</h3>
              <p className="text-gray-600">Добавьте первое мероприятие для начала работы</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить мероприятие
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.name}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  <strong>Расписание:</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.schedule.map((sched, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className={`${dayColors[sched.dayOfWeek]} hover:bg-opacity-80`}
                    >
                      {dayNamesRu[sched.dayOfWeek]} {sched.startTime}-{sched.endTime}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Описание:</strong> {selectedEvent.description || "Нет описания"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Статус:</strong> {selectedEvent.is_active ? "Активно" : "Неактивно"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Посещений:</strong> {attendanceMap.get(selectedEvent.name)?.length || 0}
                </p>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Посетившие школьники</h3>
                {attendanceMap.get(selectedEvent.name)?.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">Учащийся</TableHead>
                          <TableHead className="w-[30%]">Время</TableHead>
                          <TableHead className="w-[20%]">Сканировал</TableHead>
                          <TableHead className="w-[20%]">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceMap.get(selectedEvent.name)?.map((record) => {
                        console.log("Rendering attendance record:", record);
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="truncate">{record.studentName}</TableCell>
                            <TableCell>{record.timestamp.toLocaleString("ru-RU")}</TableCell>
                            <TableCell>{record.scanned_by}</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="whitespace-nowrap"
                                onClick={() => handleDeleteAttendance(record.id, selectedEvent.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Удалить
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Нет записей о посещении</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchoolDetails() {
  const params = useParams();
  const schoolId = params.id as string;
  const router = useRouter();
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    setToken(t);
    if (!t) {
      router.push("/login");
      return;
    }
    fetchSchool(t);
  }, [schoolId, router]);

  const fetchSchool = async (t: string) => {
    try {
      console.log("Fetching school:", schoolId);
      const data = await getSchoolById(schoolId, t);
      console.log("Loaded school:", data);
      setSchool({ id: data.id, name: data.name });
    } catch (err) {
      console.error("Error fetching school:", err);
      toast.error("Ошибка загрузки школы");
      setSchool({ id: schoolId, name: "Неизвестная школа" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (!school) return <div>Школа не найдена</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">{school.name}</h1>
            <p className="text-muted-foreground">Управление сущностями школы</p>
          </div>
          <div className="flex gap-2">
            <Link href="/schools">
              <Button variant="outline">← Назад к школам</Button>
            </Link>
            <Button variant="outline" onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}>
              <LogOut className="h-4 w-4 mr-2" /> Выйти
            </Button>
          </div>
        </div>

        <Tabs defaultValue="admins" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="admins">Админы школы</TabsTrigger>
            <TabsTrigger value="teachers">Преподаватели</TabsTrigger>
            <TabsTrigger value="parents">Родители</TabsTrigger>
            <TabsTrigger value="students">Учащиеся</TabsTrigger>
            <TabsTrigger value="events">Мероприятия</TabsTrigger>
          </TabsList>
          <TabsContent value="admins">
            <UsersTab schoolId={schoolId} role="school_admin" />
          </TabsContent>
          <TabsContent value="teachers">
            <UsersTab schoolId={schoolId} role="teacher" />
          </TabsContent>
          <TabsContent value="parents">
            <UsersTab schoolId={schoolId} role="parent" />
          </TabsContent>
          <TabsContent value="students">
            <StudentsTab schoolId={schoolId} />
          </TabsContent>
          <TabsContent value="events">
            <EventsTab schoolId={schoolId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}