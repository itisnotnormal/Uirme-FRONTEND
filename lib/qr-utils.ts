// QR Code generation utilities
export const generateQRCodeData = (studentId: string, studentName: string): string => {
  // Create a JSON string with student information for QR code
  const qrData = {
    type: "student_attendance",
    studentId,
    studentName,
    timestamp: new Date().toISOString(),
  }
  return JSON.stringify(qrData)
}

export const parseQRCodeData = (qrString: string): { studentId: string; studentName: string } | null => {
  try {
    const data = JSON.parse(qrString)
    if (data.type === "student_attendance" && data.studentId && data.studentName) {
      return {
        studentId: data.studentId,
        studentName: data.studentName,
      }
    }
    return null
  } catch {
    return null
  }
}

// Generate QR code URL using a QR code service
export const generateQRCodeURL = (data: string, size = 200): string => {
  const encodedData = encodeURIComponent(data)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&format=png&margin=10`
}
