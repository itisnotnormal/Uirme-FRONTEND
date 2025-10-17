"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer as Print, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import type { Student } from "@/lib/types";
import { toast } from "sonner";

interface BulkQRGeneratorProps {
  students: Student[];
}

export function BulkQRGenerator({ students }: BulkQRGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [qrCodeURLs, setQRCodeURLs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate QR codes for all students when the modal opens
  useEffect(() => {
    const generateQRCodeURLs = async () => {
      if (!isOpen) return;
      setLoading(true);
      setError(null);
      const urls: Record<string, string> = {};
      for (const student of students) {
        if (student.qr_code) {
          try {
            const url = await new Promise<string>((resolve, reject) => {
              QRCode.toDataURL(student.qr_code, { width: 256, margin: 2, errorCorrectionLevel: "H" }, (err, url) => {
                if (err) reject(err);
                else resolve(url);
              });
            });
            urls[student.id] = url;
            console.log(`Generated QR for ${student.name}:`, student.qr_code);
          } catch (err) {
            console.error(`Error generating QR for ${student.name}:`, err);
            setError(`Ошибка генерации QR-кода для ${student.name}`);
            setLoading(false);
            return;
          }
        }
      }
      setQRCodeURLs(urls);
      setLoading(false);
    };

    generateQRCodeURLs();
  }, [isOpen, students]);

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleBulkPrint = () => {
    const selectedStudentData = students.filter((s) => selectedStudents.includes(s.id));
    if (selectedStudentData.length === 0) {
      toast.error("Выберите хотя бы одного школьника для печати");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      let content = `
        <html>
          <head>
            <title>Массовые QR-коды школьников</title>
            <style>
              @page { margin: 20mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .qr-card { 
                border: 2px solid #1E3A8A; 
                border-radius: 10px; 
                padding: 20px; 
                text-align: center; 
                page-break-after: always; 
                max-width: 400px; 
                margin: 0 auto 20px auto;
              }
              .student-info { margin-bottom: 20px; }
              .student-info h2 { margin: 0 0 10px 0; font-size: 1.5rem; }
              .student-info p { margin: 5px 0; font-size: 0.9rem; color: #666; }
              .qr-code img { width: 256px; height: 256px; }
              .instructions { font-size: 12px; color: #666; margin-top: 20px; }
            </style>
          </head>
          <body onload="window.print();window.close()">
      `;
      selectedStudentData.forEach((student) => {
        const qrCodeURL = qrCodeURLs[student.id];
        if (qrCodeURL) {
          content += `
            <div class="qr-card">
              <div class="student-info">
                <h2>${student.name}</h2>
                <p>Класс: ${student.group}</p>
                <p>Секция: ${student.specialty}</p>
                <p>ID: ${student.qr_code || "Не задан"}</p>
              </div>
              <div class="qr-code">
                <img src="${qrCodeURL}" alt="QR-код для ${student.name}" />
              </div>
              <div class="instructions">
                <p>Отсканируйте этот QR-код для отметки посещения</p>
              </div>
            </div>
          `;
        }
      });
      content += `
          </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
    } else {
      toast.error("Не удалось открыть окно печати");
    }
  };

  const handleBulkDownload = () => {
    const selectedStudentData = students.filter((s) => selectedStudents.includes(s.id));
    if (selectedStudentData.length === 0) {
      toast.error("Выберите хотя бы одного школьника для скачивания");
      return;
    }

    selectedStudentData.forEach((student) => {
      const qrCodeURL = qrCodeURLs[student.id];
      if (qrCodeURL) {
        const link = document.createElement("a");
        link.href = qrCodeURL;
        link.download = `qr-${student.name.replace(/\s+/g, "_")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
    toast.success(`Скачано ${selectedStudentData.length} QR-кодов`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-transparent">
          <QrCode className="h-4 w-4 mr-2" />
          Массовые QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Массовые QR-коды школьников</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center space-x-2 pb-4 border-b">
            <Checkbox
              id="select-all"
              checked={selectedStudents.length === students.length && students.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Выбрать всех ({students.length} школьников)
            </label>
          </div>

          {/* Student List with QR Codes */}
          {loading ? (
            <p className="text-center text-gray-500">Генерация QR-кодов...</p>
          ) : error ? (
            <p className="text-red-500 text-center">{error}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <Card key={student.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Checkbox
                        id={student.id}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleStudentToggle(student.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{student.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {student.group}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center mt-2">
                      <div className="p-4 bg-white rounded-lg border-2 border-primary/20">
                        {qrCodeURLs[student.id] ? (
                          <img src={qrCodeURLs[student.id]} alt={`QR для ${student.name}`} className="w-48 h-48" />
                        ) : (
                          <p className="w-48 h-48 flex items-center justify-center text-red-500 text-center">
                            Нет QR-кода
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Actions */}
          {!loading && !error && students.length > 0 && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleBulkPrint}
                className="flex-1"
                disabled={selectedStudents.length === 0}
              >
                <Print className="h-4 w-4 mr-2" />
                Печать выбранных ({selectedStudents.length})
              </Button>
              <Button
                onClick={handleBulkDownload}
                variant="outline"
                className="flex-1 bg-transparent"
                disabled={selectedStudents.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать выбранные ({selectedStudents.length})
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
