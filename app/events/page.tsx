"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Users, Trash2, LogOut } from "lucide-react";
import { getAllEvents, getAttendanceByEvent, addEvent, toggleEventActive, deleteAttendanceRecord, deleteAllAttendanceByEvent, getTeachers } from "@/lib/database";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import type { Event, AttendanceRecord, User } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  teacher_id: z.string().min(1, "Выберите преподавателя"),
});

type EventFormData = z.infer<typeof eventSchema>;

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

// Названия дней недели на русском
const dayNamesRu: { [key: string]: string } = {
  Monday: "Понедельник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четверг",
  Friday: "Пятница",
  Saturday: "Суббота",
  Sunday: "Воскресенье",
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<User[]>([]);

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
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchEventsAndAttendance = async () => {
      setIsLoading(true);
      try {
        const fetchedEvents = await getAllEvents(token);
        console.log("Fetched events:", fetchedEvents);
        const attendancePromises = fetchedEvents.map(async (event) => ({
          eventName: event.name,
          attendance: await getAttendanceByEvent(event.name, token),
        }));
        const attendanceData = await Promise.all(attendancePromises);
        const newAttendanceMap = new Map(attendanceData.map(({ eventName, attendance }) => [eventName, attendance]));
        setEvents(fetchedEvents);
        setAttendanceMap(newAttendanceMap);
      } catch (error: any) {
        console.error("Error fetching events and attendance:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить мероприятия или посещаемость",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTeachers = async () => {
      try {
        const fetchedTeachers = await getTeachers(token);
        setTeachers(fetchedTeachers);
      } catch (error: any) {
        console.error("Error fetching teachers:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить список преподавателей",
          variant: "destructive",
        });
      }
    };

    fetchEventsAndAttendance();
    fetchTeachers();
  }, [router]);

  const handleCreateEvent = async (data: EventFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const eventToAdd = {
        name: data.name,
        schedule: data.schedule,
        description: data.description || "",
        is_active: false,
        teacher_id: data.teacher_id,
      };
      const addedEvent = await addEvent(eventToAdd, token);
      if (addedEvent) {
        console.log("Event added:", addedEvent);
        setEvents((prev) => [addedEvent, ...prev]);
        setAttendanceMap((prev) => new Map(prev).set(addedEvent.name, []));
        toast({
          title: "Успех",
          description: "Мероприятие успешно создано",
        });
        setIsCreateDialogOpen(false);
        form.reset({
          name: "",
          schedule: [{ dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00" }],
          description: "",
          teacher_id: "",
        });
      } else {
        throw new Error("Failed to add event");
      }
    } catch (error: any) {
      console.error("Error in handleCreateEvent:", error);
      toast({
        title: "Ошибка",
        description: `Произошла ошибка при создании мероприятия: ${error.message || "Неизвестная ошибка"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEventActive = async (eventId: string, currentActive: boolean, eventName: string) => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }
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
      // Деактивация: удаляем все записи посещаемости
      const success = await deleteAllAttendanceByEvent(eventName, token);
      if (!success) {
        throw new Error("Не удалось удалить записи посещаемости");
      }
      setAttendanceMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(eventName, []);
        return newMap;
      });
      toast({
        title: "Успех",
        description: "Все записи посещаемости удалены",
      });
    }
    // Переключаем статус активности
    const success = await toggleEventActive(eventId, !currentActive, token);
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
      throw new Error("Не удалось изменить статус мероприятия");
    }
  } catch (error: any) {
    console.error("Error in handleToggleEventActive:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    });
    const errorMessage = error.response?.data?.error || error.message || "Неизвестная ошибка";
    toast({
      title: "Ошибка",
      description: errorMessage,
      variant: "destructive",
    });
  }
};

  const handleDeleteAttendance = async (recordId: string, eventName: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const success = await deleteAttendanceRecord(recordId, token);
      if (success) {
        setAttendanceMap((prev) => {
          const newMap = new Map(prev);
          const updatedAttendance = newMap.get(eventName)?.filter((record) => record.id !== recordId) || [];
          newMap.set(eventName, updatedAttendance);
          return newMap;
        });
        toast({
          title: "Успех",
          description: "Запись о посещении удалена",
        });
      } else {
        throw new Error("Failed to delete attendance record");
      }
    } catch (error: any) {
      console.error("Error deleting attendance:", error);
      toast({
        title: "Ошибка",
        description: `Произошла ошибка при удалении записи: ${error.message || "Неизвестная ошибка"}`,
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const openDetailsDialog = (event: Event) => {
    console.log("Opening details for event:", event);
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Управление мероприятиями</h1>
            <p className="text-muted-foreground">Создавайте и управляйте внеклассными мероприятиями</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Создать мероприятие
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Создать новое мероприятие</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleCreateEvent)} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название</Label>
                    <Input id="name" {...form.register("name")} />
                    {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="teacher_id">Преподаватель</Label>
                    <Select
                      onValueChange={(value) => form.setValue("teacher_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name || teacher.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.teacher_id && <p className="text-red-500 text-sm">{form.formState.errors.teacher_id.message}</p>}
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
                    <Textarea id="description" {...form.register("description")} placeholder="Опционально" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Отмена
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Создание..." : "Создать"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="text-center">Загрузка мероприятий...</div>
        ) : events.length === 0 ? (
          <div className="text-center text-muted-foreground">Нет мероприятий</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                onClick={() => openDetailsDialog(event)}
              >
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{event.name}</CardTitle>
                        {event.description && (
                          <CardDescription className="mt-1 text-sm line-clamp-2">{event.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-2 flex-shrink-0">
                      {event.is_active && <Badge variant="default">Активно</Badge>}
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEventActive(event.id, event.is_active, event.name);
                        }}
                      >
                        {event.is_active ? "Деактивировать" : "Активировать"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-muted-foreground">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {event.schedule?.map((sched, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className={`${dayColors[sched.dayOfWeek]} hover:bg-opacity-80`}
                          >
                            {dayNamesRu[sched.dayOfWeek]} {sched.startTime}-{sched.endTime}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Посещений: {attendanceMap.get(event.name)?.length || 0}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Event Details Dialog */}
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
                    {selectedEvent.schedule?.map((sched, idx) => (
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
                          {attendanceMap.get(selectedEvent.name)?.map((record) => (
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
                          ))}
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