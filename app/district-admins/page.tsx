"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogOut, Plus, Edit, Trash } from "lucide-react";
import { getAllUsers, addUser, updateUser, deleteUser } from "@/lib/database";
import { toast } from "sonner";
import Link from "next/link";

interface DistrictAdmin {
  id: string;
  email: string;
  name: string;
  city: string;
}

export default function DistrictAdminsPage() {
  const router = useRouter();
  const [districtAdmins, setDistrictAdmins] = useState<DistrictAdmin[]>([]);
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "", name: "", city: "" });
  const [editAdmin, setEditAdmin] = useState<DistrictAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);

    const fetchData = async () => {
      try {
        const users = await getAllUsers(t, undefined, "district_admin");
        setDistrictAdmins(users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name || "",
          city: user.city || "",
        })));
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Ошибка при загрузке данных");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleAddAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.name || !newAdmin.city) {
      toast.error("Заполните все поля");
      return;
    }
    try {
      await addUser({ ...newAdmin, role: "district_admin" }, token);
      const users = await getAllUsers(token, undefined, "district_admin");
      setDistrictAdmins(users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name || "",
        city: user.city || "",
      })));
      setNewAdmin({ email: "", password: "", name: "", city: "" });
      toast.success("Админ района добавлен");
    } catch (err) {
      console.error("Error adding admin:", err);
      toast.error("Ошибка при добавлении админа");
    }
  };

  const handleEditAdmin = async () => {
    if (!editAdmin || !editAdmin.email || !editAdmin.name || !editAdmin.city) {
      toast.error("Заполните все поля");
      return;
    }
    try {
      await updateUser(editAdmin.id, { email: editAdmin.email, name: editAdmin.name, city: editAdmin.city }, token);
      const users = await getAllUsers(token, undefined, "district_admin");
      setDistrictAdmins(users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name || "",
        city: user.city || "",
      })));
      setEditAdmin(null);
      toast.success("Админ района обновлен");
    } catch (err) {
      console.error("Error updating admin:", err);
      toast.error("Ошибка при обновлении админа");
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    try {
      await deleteUser(id, token);
      setDistrictAdmins(districtAdmins.filter((admin) => admin.id !== id));
      toast.success("Админ района удален");
    } catch (err) {
      console.error("Error deleting admin:", err);
      toast.error("Ошибка при удалении админа");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Управление админами районов</h1>
            <p className="text-muted-foreground">Добавление, редактирование и удаление районных администраторов</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Список админов районов</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mb-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить админа района
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить нового админа района</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      placeholder="Введите email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      placeholder="Введите пароль"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Имя</Label>
                    <Input
                      id="name"
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      placeholder="Введите имя"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Город/Район</Label>
                    <Input
                      id="city"
                      value={newAdmin.city}
                      onChange={(e) => setNewAdmin({ ...newAdmin, city: e.target.value })}
                      placeholder="Введите город"
                    />
                  </div>
                  <Button onClick={handleAddAdmin}>Добавить</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Город/Район</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {districtAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.name}</TableCell>
                    <TableCell>{admin.city}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => setEditAdmin(admin)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Редактировать админа района</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-email">Email</Label>
                              <Input
                                id="edit-email"
                                value={editAdmin?.email || ""}
                                onChange={(e) =>
                                  setEditAdmin((prev) => prev ? { ...prev, email: e.target.value } : null)
                                }
                                placeholder="Введите email"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-name">Имя</Label>
                              <Input
                                id="edit-name"
                                value={editAdmin?.name || ""}
                                onChange={(e) =>
                                  setEditAdmin((prev) => prev ? { ...prev, name: e.target.value } : null)
                                }
                                placeholder="Введите имя"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-city">Город/Район</Label>
                              <Input
                                id="edit-city"
                                value={editAdmin?.city || ""}
                                onChange={(e) =>
                                  setEditAdmin((prev) => prev ? { ...prev, city: e.target.value } : null)
                                }
                                placeholder="Введите город"
                              />
                            </div>
                            <Button onClick={handleEditAdmin}>Сохранить</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">← Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}