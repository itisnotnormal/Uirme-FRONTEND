"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

interface School {
  _id: string;
  name: string;
}

interface Admin {
  _id: string;
  email: string;
  role: string;
  school_id?: { _id: string; name: string };
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "", school_id: "" });
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchAdmins(token);
    fetchSchools(token);
  }, [router]);

  const fetchAdmins = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      const data = await response.json();
      setAdmins(data.filter((user: Admin) => user.role === "school_admin"));
    } catch (err) {
      console.error("Error fetching admins:", err);
      toast.error("Ошибка при загрузке админов");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/schools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      const data = await response.json();
      setSchools(data);
    } catch (err) {
      console.error("Error fetching schools:", err);
      toast.error("Ошибка при загрузке школ");
    }
  };

  const handleCreateOrUpdateAdmin = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newAdmin, role: "school_admin" }),
      });

      if (response.ok) {
        await fetchAdmins(token);
        setIsDialogOpen(false);
        setNewAdmin({ email: "", password: "", school_id: "" });
        setEditingAdmin(null);
        toast.success("Админ создан");
      } else {
        toast.error("Ошибка при создании админа");
      }
    } catch (err) {
      console.error("Error saving admin:", err);
      toast.error("Ошибка при создании админа");
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchAdmins(token);
        toast.success("Админ удален");
      } else {
        toast.error("Ошибка при удалении админа");
      }
    } catch (err) {
      console.error("Error deleting admin:", err);
      toast.error("Ошибка при удалении админа");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Управление админами</h1>
            <p className="text-muted-foreground">Создавайте и управляйте школьными администраторами</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить админа
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAdmin ? "Редактировать админа" : "Добавить админа"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="school_id">Школа</Label>
                    <Select
                      value={newAdmin.school_id}
                      onValueChange={(value) => setNewAdmin({ ...newAdmin, school_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите школу" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school._id} value={school._id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleCreateOrUpdateAdmin}>
                      {editingAdmin ? "Сохранить" : "Создать"}
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
          {admins.map((admin) => (
            <Card key={admin._id}>
              <CardHeader>
                <CardTitle>{admin.email}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <p>Школа: {admin.school_id?.name || "Не назначена"}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingAdmin(admin);
                        setNewAdmin({
                          email: admin.email,
                          password: "",
                          school_id: admin.school_id?._id || "",
                        });
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button variant="destructive" onClick={() => handleDeleteAdmin(admin._id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">← Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}