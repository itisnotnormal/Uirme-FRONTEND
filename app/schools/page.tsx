"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Plus, Edit, Trash2, UserCog } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllSchools, addSchool, updateSchool, deleteSchool, getAllUsers, assignSchoolToDistrictAdmin } from "@/lib/database";
import { School, User } from "@/lib/types";

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [districtAdmins, setDistrictAdmins] = useState<User[]>([]);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCity, setNewSchoolCity] = useState("");
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [assignSchool, setAssignSchool] = useState<School | null>(null);
  const [selectedDistrictAdminId, setSelectedDistrictAdminId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);
    fetchSchools(t);
    fetchDistrictAdmins(t);
  }, [router]);

  const fetchSchools = async (t: string) => {
    try {
      const data = await getAllSchools(t);
      setSchools(data);
    } catch (err) {
      console.error("Error fetching schools:", err);
      toast.error("Ошибка при загрузке школ");
    } finally {
      setLoading(false);
    }
  };

  const fetchDistrictAdmins = async (t: string) => {
    try {
      const data = await getAllUsers(t, undefined, "district_admin");
      setDistrictAdmins(data);
    } catch (err) {
      console.error("Error fetching district admins:", err);
      toast.error("Ошибка при загрузке админов районов");
    }
  };

  const handleCreateOrUpdateSchool = async () => {
    if (!token) return;
    try {
      let updatedSchool: School | null = null;
      if (editingSchool) {
        updatedSchool = await updateSchool(editingSchool.id, newSchoolName, newSchoolCity, token);
      } else {
        updatedSchool = await addSchool(newSchoolName, newSchoolCity, token);
      }
      if (updatedSchool) {
        await fetchSchools(token);
        setIsDialogOpen(false);
        setNewSchoolName("");
        setNewSchoolCity("");
        setEditingSchool(null);
        toast.success(editingSchool ? "Школа обновлена" : "Школа создана");
      }
    } catch (err) {
      toast.error("Ошибка при сохранении школы");
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!token) return;
    try {
      await deleteSchool(id, token);
      await fetchSchools(token);
      toast.success("Школа удалена");
    } catch (err) {
      toast.error("Ошибка при удалении школы");
    }
  };

  const handleAssignSchool = async () => {
    if (!token || !assignSchool || !selectedDistrictAdminId) return;
    try {
      await assignSchoolToDistrictAdmin(assignSchool.id, selectedDistrictAdminId, token);
      await fetchSchools(token);
      setIsAssignDialogOpen(false);
      setAssignSchool(null);
      setSelectedDistrictAdminId("");
      toast.success("Школа привязана к админу района");
    } catch (err) {
      console.error("Error assigning school:", err);
      toast.error("Ошибка при привязке школы");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Управление школами</h1>
            <p className="text-muted-foreground">Создавайте и управляйте школами</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить школу
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSchool ? "Редактировать школу" : "Добавить школу"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название школы</Label>
                    <Input
                      id="name"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Город/Район</Label>
                    <Input
                      id="city"
                      value={newSchoolCity}
                      onChange={(e) => setNewSchoolCity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleCreateOrUpdateSchool}>
                      {editingSchool ? "Сохранить" : "Создать"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {schools.map((school) => (
            <Card key={school.id}>
              <CardHeader>
                <CardTitle>{school.name} ({school.city})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p>Создано: {school.createdAt.toLocaleDateString("ru-RU")}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href={`/schools/${school.id}`}>
                      <Button variant="default">Управлять</Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingSchool(school);
                        setNewSchoolName(school.name);
                        setNewSchoolCity(school.city || "");
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAssignSchool(school);
                        setIsAssignDialogOpen(true);
                      }}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Назначить админа
                    </Button>
                    <Button variant="destructive" onClick={() => handleDeleteSchool(school.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Назначить админа района для школы</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="district-admin">Админ района</Label>
                <Select
                  value={selectedDistrictAdminId}
                  onValueChange={setSelectedDistrictAdminId}
                >
                  <SelectTrigger id="district-admin">
                    <SelectValue placeholder="Выберите админа района" />
                  </SelectTrigger>
                  <SelectContent>
                    {districtAdmins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.name} ({admin.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleAssignSchool} disabled={!selectedDistrictAdminId}>
                  Назначить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">← Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}