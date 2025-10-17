"use client";

import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Flashlight, FlashlightOff } from "lucide-react";
import { addAttendanceRecord, getStudentByqr_code as getStudentByQRCode, checkAttendanceExists } from "@/lib/database";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";
import type { Event } from "@/lib/types";

interface QRScannerProps {
  onScanSuccess: () => void;
  selectedEvent: Event | null;
}

export function QRScanner({ onScanSuccess, selectedEvent }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    studentName?: string;
    eventName?: string;
    timestamp: Date;
  } | null>(null);
  const [manualQrCode, setManualQrCode] = useState("");
  const [isManualInput, setIsManualInput] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null); // Prevent duplicate scans

  const startScanner = async () => {
    if (videoRef.current && !scanner) {
      try {
        setError(null);
        console.log("Starting QR scanner with facingMode:", facingMode);
        const qrScanner = new QrScanner(
          videoRef.current,
          async (result) => {
            if (!scanning || result.data === lastScannedCode) return;

            // Stop scanner to prevent multiple scans
            qrScanner.stop();
            setScanning(false);
            setScanner(null);
            setLastScannedCode(result.data);

            console.log("Scanned QR code:", result.data);
            await handleScan(result.data);
          },
          {
            returnDetailedScanResult: true,
            preferredCamera: facingMode,
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        await qrScanner.start();
        setScanner(qrScanner);
        console.log("Scanner started successfully");
        const flashAvailable = await qrScanner.hasFlash();
        setHasFlash(flashAvailable);
      } catch (err: any) {
        console.error("Camera access error:", err.name, err.message, err.stack);
        let errorMessage = "Не удалось получить доступ к камере. Проверьте разрешения и попробуйте ввести QR-код вручную.";
        if (err.name === "NotAllowedError") {
          errorMessage = "Доступ к камере запрещён. Разрешите доступ в настройках браузера и перезагрузите страницу.";
        } else if (err.name === "NotFoundError") {
          errorMessage = "Камера не найдена. Подключите камеру или используйте другое устройство.";
        } else if (err.name === "NotReadableError") {
          errorMessage = "Камера занята другим приложением. Закройте другие приложения и попробуйте снова.";
        } else if (err.name === "OverconstrainedError") {
          errorMessage = "Выбранная камера не поддерживается. Попробуйте переключить камеру или ввести QR-код вручную.";
        }
        setError(errorMessage);
        setIsManualInput(true);
      }
    }
  };

  useEffect(() => {
    if (scanning && !isManualInput) {
      startScanner();
    }

    return () => {
      scanner?.destroy();
      setScanner(null);
      console.log("Scanner destroyed");
    };
  }, [scanning, facingMode, isManualInput]);

  const handleScan = async (data: string) => {
    try {
      const token = localStorage.getItem("token");
      console.log("Token for scan:", token ? token.slice(0, 10) + "..." : "No token");
      if (!token) {
        setScanResult({
          success: false,
          message: "Токен отсутствует. Пожалуйста, войдите снова.",
          timestamp: new Date(),
        });
        toast.error("Токен отсутствует. Пожалуйста, войдите снова.");
        // Перенаправление на страницу логина
        window.location.href = "/login";
        return;
      }
  
      if (!selectedEvent) {
        setScanResult({
          success: false,
          message: "Выберите активное мероприятие для сканирования",
          timestamp: new Date(),
        });
        toast.error("Выберите активное мероприятие");
        setScanning(true);
        return;
      }
  
      const student = await getStudentByQRCode(data, token); // Используем правильное имя функции
      if (!student) {
        setScanResult({
          success: false,
          message: "Учащийся не найден",
          timestamp: new Date(),
        });
        toast.error("Учащийся не найден");
        setScanning(true);
        return;
      }
  
      console.log("Fetched student:", student);
      const attendanceExists = await checkAttendanceExists(student.id, selectedEvent.name, token);
      console.log("Attendance check result:", attendanceExists);
      if (attendanceExists) {
        setScanResult({
          success: false,
          message: `Посещение для ${student.name} уже отмечено для ${selectedEvent.name}`,
          timestamp: new Date(),
        });
        toast.error(`Посещение для ${student.name} уже отмечено`);
        setScanning(true);
        return;
      }
  
      const attendanceRecord = await addAttendanceRecord(
        {
          student_id: student.id,
          event_name: selectedEvent.name,
          scanned_by: "scanner",
          studentName: student.name,
          timestamp: new Date(),
        },
        token
      );
  
      if (attendanceRecord) {
        setScanResult({
          success: true,
          studentName: student.name,
          eventName: selectedEvent.name,
          message: `Посещение отмечено для ${student.name} на мероприятии ${selectedEvent.name}`,
          timestamp: new Date(),
        });
        toast.success(`Посещение отмечено для ${student.name}`);
        onScanSuccess();
        setManualQrCode("");
      } else {
        setScanResult({
          success: false,
          message: "Ошибка при отметке посещения",
          timestamp: new Date(),
        });
        toast.error("Ошибка при отметке посещения");
      }
    } catch (error: any) {
      console.error("QR scan error:", error.message, error.stack);
      const message = error.message.includes("unique_student_event")
        ? `Посещение для этого школьника уже отмечено для ${selectedEvent?.name || "мероприятия"}`
        : error.message || "Ошибка при обработке QR-кода";
      setScanResult({
        success: false,
        message,
        timestamp: new Date(),
      });
      toast.error(message);
      setScanning(true);
    }
  };

  const toggleCamera = async () => {
    if (scanner) {
      const newMode = facingMode === "environment" ? "user" : "environment";
      setFacingMode(newMode);
      scanner.destroy();
      setScanner(null);
      setError(null);
      setIsManualInput(false);
      await startScanner();
    }
  };

  const toggleFlash = async () => {
    if (scanner) {
      if (flashOn) {
        await scanner.turnFlashOff();
        setFlashOn(false);
      } else {
        await scanner.turnFlashOn();
        setFlashOn(true);
      }
    }
  };

  const handleManualSubmit = async () => {
    if (!manualQrCode) {
      toast.error("Введите QR-код");
      return;
    }
    await handleScan(manualQrCode);
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setIsManualInput(false);
    setScanning(true);
    setLastScannedCode(null); // Reset to allow new scans
  };

  if (!selectedEvent) {
    return <div className="text-center text-muted-foreground">Выберите мероприятие для начала сканирования</div>;
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <div className="flex gap-4 justify-center mt-4">
              <Button onClick={resetScanner}>Повторить попытку</Button>
              {hasFlash && (
                <Button onClick={toggleFlash}>
                  {flashOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                </Button>
              )}
              <Button onClick={() => setIsManualInput(true)}>Ввести QR-код вручную</Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Убедитесь, что:
              <ul className="list-disc list-inside text-left max-w-xs mx-auto">
                <li>Вы разрешили доступ к камере в настройках браузера.</li>
                <li>Камера не используется другими приложениями.</li>
                <li>Сайт работает через HTTPS или localhost.</li>
                <li>Ваше устройство имеет рабочую камеру.</li>
              </ul>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!error && !isManualInput && (
        <div className="relative">
          <video ref={videoRef} className="w-full rounded-lg" autoPlay playsInline muted />
          {scanning && (
            <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary"></div>
            </div>
          )}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            <Button variant="secondary" size="icon" onClick={toggleCamera}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            {hasFlash && (
              <Button variant="secondary" size="icon" onClick={toggleFlash}>
                {flashOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      )}

      {isManualInput && (
        <div className="space-y-4">
          <Input
            placeholder="Введите QR-код"
            value={manualQrCode}
            onChange={(e) => setManualQrCode(e.target.value)}
            className="w-full"
          />
          <div className="flex gap-4 justify-center">
            <Button onClick={handleManualSubmit}>Подтвердить</Button>
            <Button variant="outline" onClick={resetScanner}>
              Вернуться к сканированию
            </Button>
          </div>
        </div>
      )}

      {scanResult && (
        <Alert variant={scanResult.success ? "default" : "destructive"}>
          {scanResult.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4" />}
          <AlertDescription>
            <div className="space-y-2">
              {scanResult.success && scanResult.studentName && (
                <div className="font-semibold text-green-700">Ученик: {scanResult.studentName}</div>
              )}
              {scanResult.success && scanResult.eventName && (
                <div className="font-semibold text-green-700">Мероприятие: {scanResult.eventName}</div>
              )}
              <div>{scanResult.message}</div>
              <div className="text-sm text-muted-foreground">{scanResult.timestamp.toLocaleString("ru-RU")}</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {(error || scanResult) && !isManualInput && (
        <Button onClick={resetScanner} variant="outline" className="w-full bg-transparent">
          <RotateCcw className="h-4 w-4 mr-2" />
          Сканировать еще
        </Button>
      )}

      {!error && !isManualInput && !scanResult && (
        <div className="text-center mt-4 space-y-2">
          <p className="text-muted-foreground">
            Сканирование для мероприятия: {selectedEvent.name}
          </p>
          <Button variant="outline" onClick={() => setIsManualInput(true)}>
            Ввести QR-код вручную
          </Button>
        </div>
      )}
    </div>
  );
}