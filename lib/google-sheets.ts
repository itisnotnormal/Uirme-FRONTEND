// Google Sheets integration utilities
export interface GoogleSheetsConfig {
  spreadsheetId: string
  apiKey: string
  range: string
}

export interface SheetRow {
  [key: string]: string | number | Date
}

// Format attendance data for Google Sheets export
export const formatAttendanceForSheets = (attendanceRecords: any[], students: any[], events: any[]) => {
  const headers = ["Дата и время", "Имя ученика", "Класс", "ID ученика", "Мероприятие", "Отмечено преподавателем"]

  const rows = attendanceRecords.map((record) => {
    const student = students.find((s) => s.id === record.studentId)
    return [
      record.timestamp.toLocaleString("ru-RU"),
      record.studentName,
      student?.class || "Не указан",
      record.studentId,
      record.eventName,
      record.scanned_by,
    ]
  })

  return [headers, ...rows]
}

// Format students data for Google Sheets export
export const formatStudentsForSheets = (students: any[]) => {
  const headers = ["ID", "Имя", "Класс", "QR-код", "Дата добавления"]

  const rows = students.map((student) => [
    student.id,
    student.name,
    student.class,
    student.qr_code,
    student.createdAt.toLocaleString("ru-RU"),
  ])

  return [headers, ...rows]
}

// Generate CSV content for download
export const generateCSV = (data: (string | number)[][]): string => {
  return data
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell)
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(","),
    )
    .join("\n")
}

// Simulate Google Sheets API integration
export const exportToGoogleSheets = async (
  data: (string | number)[][],
  config: GoogleSheetsConfig,
): Promise<{ success: boolean; message: string; url?: string }> => {
  try {
    // In a real implementation, this would use the Google Sheets API
    // For demonstration, we'll simulate the API call

    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API delay

    // Simulate successful export
    const mockSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`

    return {
      success: true,
      message: `Данные успешно экспортированы в Google Sheets (${data.length - 1} записей)`,
      url: mockSpreadsheetUrl,
    }
  } catch (error) {
    return {
      success: false,
      message: "Ошибка при экспорте в Google Sheets. Проверьте настройки API.",
    }
  }
}

// Google Sheets API configuration
export const getDefaultSheetsConfig = (): GoogleSheetsConfig => ({
  spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", // Example spreadsheet ID
  apiKey: process.env.GOOGLE_SHEETS_API_KEY || "demo-api-key",
  range: "Sheet1!A1:Z1000",
})
