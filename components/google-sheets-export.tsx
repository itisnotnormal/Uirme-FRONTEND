"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileSpreadsheet, Download, Upload, Settings, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import {
  exportToGoogleSheets,
  formatAttendanceForSheets,
  formatStudentsForSheets,
  generateCSV,
  getDefaultSheetsConfig,
  type GoogleSheetsConfig,
} from "@/lib/google-sheets";
import type { AttendanceRecord, Student, Event } from "@/lib/types";

interface GoogleSheetsExportProps {
  attendanceRecords: AttendanceRecord[];
  students: Student[];
  events: Event[];
}

export function GoogleSheetsExport({ attendanceRecords, students, events }: GoogleSheetsExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [config, setConfig] = useState<GoogleSheetsConfig>(getDefaultSheetsConfig());
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleExportAttendance = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const sheetData = formatAttendanceForSheets(attendanceRecords, students, events);
      const result = await exportToGoogleSheets(sheetData, config);
      setExportResult(result);
    } catch (error) {
      setExportResult({
        success: false,
        message: "Произошла ошибка при экспорте данных",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportStudents = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const sheetData = formatStudentsForSheets(students);
      const result = await exportToGoogleSheets(sheetData, config);
      setExportResult(result);
    } catch (error) {
      setExportResult({
        success: false,
        message: "Произошла ошибка при экспорте данных",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCSV = (type: "attendance" | "students") => {
    let data: (string | number)[][];
    let filename: string;

    if (type === "attendance") {
      data = formatAttendanceForSheets(attendanceRecords, students, events);
      filename = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      data = formatStudentsForSheets(students);
      filename = `students-${new Date().toISOString().split("T")[0]}.csv`;
    }

    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg truncate">
                <FileSpreadsheet className="h-5 w-5 flex-shrink-0" />
                Экспорт в Google Sheets
              </CardTitle>
              <CardDescription className="truncate">
                Экспортируйте данные посещаемости и учеников в Google Sheets
              </CardDescription>
            </div>
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Настройки
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Настройки Google Sheets</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="spreadsheet-id">ID таблицы Google Sheets</Label>
                    <Input
                      id="spreadsheet-id"
                      value={config.spreadsheetId}
                      onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })}
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      disabled={isExporting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="api-key">API ключ Google</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Введите API ключ"
                      disabled={isExporting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="range">Диапазон ячеек</Label>
                    <Input
                      id="range"
                      value={config.range}
                      onChange={(e) => setConfig({ ...config, range: e.target.value })}
                      placeholder="Sheet1!A1:Z1000"
                      disabled={isExporting}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attendance">Посещаемость</TabsTrigger>
              <TabsTrigger value="students">Ученики</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">Данные посещаемости</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    Экспорт всех записей посещаемости ({attendanceRecords.length} записей)
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    onClick={() => handleDownloadCSV("attendance")}
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button onClick={handleExportAttendance} disabled={isExporting} size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {isExporting ? "Экспорт..." : "В Google Sheets"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">Список учеников</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    Экспорт всех учеников с QR-кодами ({students.length} учеников)
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    onClick={() => handleDownloadCSV("students")}
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button onClick={handleExportStudents} disabled={isExporting} size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {isExporting ? "Экспорт..." : "В Google Sheets"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Export Result */}
      {exportResult && (
        <Alert variant={exportResult.success ? "default" : "destructive"}>
          {exportResult.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4" />}
          <AlertDescription>
            <div className="space-y-2">
              <div>{exportResult.message}</div>
              {exportResult.success && exportResult.url && (
                <div>
                  <a
                    href={exportResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Открыть таблицу <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Статистика данных</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{students.length}</div>
              <div className="text-sm text-muted-foreground">Всего учеников</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{attendanceRecords.length}</div>
              <div className="text-sm text-muted-foreground">Записей посещаемости</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{events.length}</div>
              <div className="text-sm text-muted-foreground">Мероприятий</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Инструкции по настройке</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">1. Создайте Google Sheets API ключ:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Перейдите в Google Cloud Console</li>
              <li>Создайте новый проект или выберите существующий</li>
              <li>Включите Google Sheets API</li>
              <li>Создайте учетные данные (API ключ)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">2. Настройте таблицу Google Sheets:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Создайте новую таблицу Google Sheets</li>
              <li>Скопируйте ID таблицы из URL</li>
              <li>Предоставьте доступ для редактирования вашему API ключу</li>
            </ul>
          </div>
          <Badge variant="secondary" className="text-xs">
            Для демонстрации используется симуляция API
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}