"use client";

import type { Student, AttendanceRecord, Event, School, User, AnalyticsData } from "./types";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";


export async function getAllStudents(token: string): Promise<Student[]> {
  console.log("Fetching all students with token:", token);
  const res = await fetch(`${API_URL}/students`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  console.log("Response status for getAllStudents:", res.status);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching students:", errorData);
    throw new Error(`Error fetching students: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const students = await res.json();
  return students.map((student: any) => ({
    id: student._id,
    name: student.name,
    group: student.group,
    specialty: student.specialty,
    qr_code: student.qr_code,
    school_id: student.school_id,
    createdAt: new Date(student.created_at),
  }));
}

export async function getStudentById(id: string, token: string): Promise<Student | null> {
  const res = await fetch(`${API_URL}/students/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching student by ID:", errorData);
    throw new Error(`Error fetching student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const student = await res.json();
  return {
    id: student._id,
    name: student.name,
    group: student.group,
    specialty: student.specialty,
    school_id: student.school_id,
    qr_code: student.qr_code,
    createdAt: new Date(student.created_at),
  };
}

export async function getStudentByqr_code(qr_code: string, token: string): Promise<Student | null> {
  console.log("Fetching student by QR code:", qr_code, "with token:", token.slice(0, 10) + "...");
  const res = await fetch(`${API_URL}/students/qr/${qr_code}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  console.log("Response status for getStudentByQRCode:", res.status);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching student by QR:", errorData);
    throw new Error(`Error fetching student by QR: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const student = await res.json();
  console.log("Fetched student by QR:", student);
  return {
    id: student._id,
    name: student.name,
    group: student.group,
    specialty: student.specialty,
    qr_code: student.qr_code,
    school_id: student.school_id,
    createdAt: new Date(student.created_at),
  };
}

export async function addStudent(student: Omit<Student, "id" | "createdAt" | "qr_code"> & { email: string, password: string, enrolled_events?: string[], school_id?: string }, token: string): Promise<Student | null> {
  const res = await fetch(`${API_URL}/students`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(student),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error adding student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const addedStudent = await res.json();
  return {
    id: addedStudent._id,
    name: addedStudent.name,
    group: addedStudent.group,
    specialty: addedStudent.specialty,
    qr_code: addedStudent.qr_code,
    school_id: addedStudent.school_id,
    createdAt: new Date(addedStudent.created_at),
  };
}

export async function getMyStudent(token: string): Promise<Student | null> {
  const res = await fetch(`${API_URL}/my-student`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching my student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const student = await res.json();
  return {
    id: student._id,
    name: student.name,
    group: student.group,
    specialty: student.specialty,
    qr_code: student.qr_code,
    school_id: student.school_id,
    createdAt: new Date(student.created_at),
  };
}

export async function getMyChildren(token: string): Promise<Student[]> {
  console.log("Fetching children with Token:", token.slice(0, 10) + "...");
  const res = await fetch(`${API_URL}/my-children`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching children:", {
      status: res.status,
      statusText: res.statusText,
      error: errorData.error,
    });
    throw new Error(`Error fetching children: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const childrenData = await res.json();
  return childrenData.map((child: any) => ({
    id: child._id,
    name: child.name,
    group: child.group || "",
    specialty: child.specialty || "",
    qr_code: child.qr_code,
    school_id: child.school_id,
    createdAt: new Date(child.created_at),
  }));
}

export async function addChildToParent(parentId: string, studentId: string, token: string): Promise<User | null> {
  const res = await fetch(`${API_URL}/users/${parentId}/add-child`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ student_id: studentId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error adding child: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const updatedUser = await res.json();
  return {
    id: updatedUser._id,
    email: updatedUser.email,
    role: updatedUser.role,
    school_id: updatedUser.school_id,
    createdAt: new Date(updatedUser.created_at),
  };
}

// New function for removing child from parent
export async function removeChildFromParent(parentId: string, studentId: string, token: string): Promise<User | null> {
  const res = await fetch(`${API_URL}/users/${parentId}/remove-child`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ student_id: studentId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error removing child: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const updatedUser = await res.json();
  return {
    id: updatedUser._id,
    email: updatedUser.email,
    role: updatedUser.role,
    school_id: updatedUser.school_id,
    createdAt: new Date(updatedUser.created_at),
  };
}

export async function updateStudent(id: string, updates: Partial<Omit<Student, "id" | "createdAt">>, token: string): Promise<Student | null> {
  console.log("Updating student with data:", JSON.stringify(updates, null, 2));
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error updating student:", errorData);
    throw new Error(`Error updating student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const updatedStudent = await res.json();
  return {
    id: updatedStudent._id,
    name: updatedStudent.name,
    group: updatedStudent.group,
    specialty: updatedStudent.specialty,
    qr_code: updatedStudent.qr_code,
    school_id: updatedStudent.school_id?._id || updatedStudent.school_id,
    createdAt: new Date(updatedStudent.created_at),
  };
}

export async function deleteStudent(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting student:", errorData);
    throw new Error(`Error deleting student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAllAttendanceRecords(token: string, schoolId?: string, period?: 'week' | 'month' | 'year' | 'all'): Promise<AttendanceRecord[]> {
  if (schoolId && period) {
    return getAttendanceBySchoolAndPeriod(schoolId, period, token);
  }
  const res = await fetch(`${API_URL}/attendance`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching attendance records:", errorData);
    throw new Error(`Error fetching attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function addAttendanceRecord(record: Omit<AttendanceRecord, "id">, token: string): Promise<AttendanceRecord | null> {
  console.log("Sending attendance record:", record);
  const res = await fetch(`${API_URL}/attendance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      student_id: record.student_id,
      event_name: record.event_name,
      timestamp: record.timestamp,
      scanned_by: record.scanned_by,
      studentName: record.studentName,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error adding attendance:", errorData);
    throw new Error(`Error adding attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const addedRecord = await res.json();
  return {
    id: addedRecord._id,
    student_id: addedRecord.student_id,
    event_name: addedRecord.event_name,
    timestamp: new Date(addedRecord.timestamp),
    scanned_by: addedRecord.scanned_by,
    studentName: addedRecord.studentName,
  };
}

export async function checkAttendanceExists(studentId: string, eventName: string, token: string): Promise<boolean> {
  try {
    console.log(`Checking attendance for studentId: ${studentId}, eventName: ${eventName}`);
    const res = await fetch(`${API_URL}/attendance/check?studentId=${studentId}&eventName=${eventName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      console.error("Error checking attendance:", errorData);
      throw new Error(`Error checking attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
    }
    const result = await res.json();
    console.log("Attendance check result:", result);
    return result;
  } catch (err) {
    console.error("Error in checkAttendanceExists:", err);
    throw err;
  }
}

export async function getAttendanceByEvent(eventName: string, token: string, schoolId?: string): Promise<AttendanceRecord[]> {
  const encodedEventName = encodeURIComponent(eventName.trim());
  let url = `${API_URL}/attendance/event/${encodedEventName}`;
  if (schoolId) {
    url += `?school_id=${schoolId}`;
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching attendance by event:", errorData);
    throw new Error(`Error fetching attendance by event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function getAttendanceByStudent(studentId: string, token: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`${API_URL}/attendance/student/${studentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching attendance by student:", errorData);
    throw new Error(`Error fetching attendance by student: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function deleteAttendanceRecord(recordId: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/attendance/${recordId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting attendance record:", errorData);
    throw new Error(`Error deleting attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function deleteAllAttendanceByEvent(eventName: string, token: string): Promise<boolean> {
  const encodedEventName = encodeURIComponent(eventName.trim()); // Trim and URL-encode the event name
  const res = await fetch(`${API_URL}/attendance/event/${encodedEventName}/delete-all`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting all attendance by event:", errorData);
    throw new Error(`Error deleting all attendance by event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAllEvents(token: string): Promise<Event[]> {
  const res = await fetch(`${API_URL}/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching events:", errorData);
    throw new Error(`Error fetching events: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const events = await res.json();
  return events.map((event: any) => ({
    id: event._id,
    name: event.name,
    schedule: event.schedule,
    description: event.description,
    is_active: event.is_active,
    school_id: event.school_id,
    teacher_id: event.teacher_id,
  }));
}

export async function getActiveEvents(token: string): Promise<Event[]> {
  const res = await fetch(`${API_URL}/events/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching active events:", errorData);
    throw new Error(`Error fetching active events: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const events = await res.json();
  return events.map((event: any) => ({
    id: event._id,
    name: event.name,
    schedule: event.schedule,
    description: event.description,
    is_active: event.is_active,
    school_id: event.school_id,
    teacher_id: event.teacher_id,
  }));
}

export async function addEvent(event: Omit<Event, "id">, token: string): Promise<Event | null> {
  console.log("Sending event to backend:", JSON.stringify(event, null, 2));
  const res = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...event,
      schedule: event.schedule,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error adding event:", errorData);
    throw new Error(`Error adding event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const addedEvent = await res.json();
  return {
    id: addedEvent._id,
    name: addedEvent.name,
    schedule: addedEvent.schedule,
    description: addedEvent.description,
    is_active: addedEvent.is_active,
    school_id: addedEvent.school_id,
    teacher_id: addedEvent.teacher_id,
  };
}

export async function updateEvent(id: string, updates: Partial<Omit<Event, "id">>, token: string): Promise<Event | null> {
  console.log("Updating event with data:", JSON.stringify(updates, null, 2));
  const res = await fetch(`${API_URL}/events/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...updates,
      schedule: updates.schedule,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error updating event:", errorData);
    throw new Error(`Error updating event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const updatedEvent = await res.json();
  return {
    id: updatedEvent._id,
    name: updatedEvent.name,
    schedule: updatedEvent.schedule,
    description: updatedEvent.description,
    is_active: updatedEvent.is_active,
    school_id: updatedEvent.school_id,
    teacher_id: updatedEvent.teacher_id,
  };
}

export async function toggleEventActive(eventId: string, isActive: boolean, token: string): Promise<boolean> {
  console.log(`Sending PUT to ${API_URL}/events/${eventId}/toggle-active with is_active: ${isActive}`);
  const res = await fetch(`${API_URL}/events/${eventId}/toggle-active`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Backend error in toggleEventActive:", errorData);
    throw new Error(`Error toggling event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getActiveEvent(token: string): Promise<Event | null> {
  const events = await getActiveEvents(token);
  return events[0] || null;
}

export async function setActiveEvent(eventId: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/events/${eventId}/toggle-active`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_active: true }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error setting active event:", errorData);
    throw new Error(`Error setting active event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAllSchools(token: string): Promise<School[]> {
  const res = await fetch(`${API_URL}/schools`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching schools:", errorData);
    throw new Error(`Error fetching schools: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const schools = await res.json();
  return schools.map((school: any) => ({
    id: school._id,
    name: school.name,
    city: school.city,
    createdAt: new Date(school.created_at),
  }));
}

export async function addSchool(name: string, city: string, token: string): Promise<School | null> {
  const res = await fetch(`${API_URL}/schools`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, city }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error adding school:", errorData);
    throw new Error(`Error adding school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const addedSchool = await res.json();
  return {
    id: addedSchool._id,
    name: addedSchool.name,
    city: addedSchool.city,
    createdAt: new Date(addedSchool.created_at),
  };
}

export async function assignSchoolToDistrictAdmin(schoolId: string, districtAdminId: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/schools/${schoolId}/assign`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ district_admin_id: districtAdminId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error assigning school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
}

export async function updateSchool(id: string, name: string, city: string, token: string): Promise<School | null> {
  const res = await fetch(`${API_URL}/schools/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, city }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error updating school:", errorData);
    throw new Error(`Error updating school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const updatedSchool = await res.json();
  return {
    id: updatedSchool._id,
    name: updatedSchool.name,
    city: updatedSchool.city,
    createdAt: new Date(updatedSchool.created_at),
  };
}

export async function deleteSchool(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/schools/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting school:", errorData);
    throw new Error(`Error deleting school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAllUsers(token: string, schoolId?: string, role?: string): Promise<User[]> {
  let url = `${API_URL}/users`;
  if (schoolId) url += `?school_id=${schoolId}`;
  if (role) url += `${schoolId ? '&' : '?'}role=${role}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching users:", errorData);
    throw new Error(`Error fetching users: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const users = await res.json();
  return users.map((user: any) => ({
    id: user._id,
    email: user.email,
    role: user.role,
    school_id: user.school_id?._id,
    name: user.name || "", // Explicitly include name, default to empty string if undefined
    school: user.school_id ? { id: user.school_id._id, name: user.school_id.name } : undefined,
    createdAt: new Date(user.created_at),
    children: user.children ? user.children.map((child: any) => child._id) : [],
    password: user.password,
    city: user.city,
  }));
}

export async function addUser(user: { email: string; password: string; role: string; school_id?: string; name?: string; city?: string }, token: string): Promise<User | null> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error adding user:", errorData);
    throw new Error(`Error adding user: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const response = await res.json();
  if (response.message === "User registered") {
    const users = await getAllUsers(token, user.school_id, user.role);
    const newUser = users.find((u) => u.email === user.email);
    if (!newUser) {
      throw new Error("Failed to retrieve newly created user");
    }
    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      school_id: newUser.school_id,
      createdAt: newUser.createdAt,
      name: newUser.name,
      city: newUser.city,
    };
  }
  throw new Error("Unexpected response from server");
}

export async function deleteUser(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting user:", errorData);
    throw new Error(`Error deleting user: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAnalytics(token: string): Promise<AnalyticsData> {
  const res = await fetch(`${API_URL}/analytics`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching analytics:", errorData);
    throw new Error(`Error fetching analytics: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const data = await res.json();
  return {
    totalUsers: data.totalUsers,
    usersByRole: {
      teachers: data.usersByRole.teachers,
      parents: data.usersByRole.parents,
      students: data.usersByRole.students,
      schoolAdmins: data.usersByRole.schoolAdmins.map((admin: any) => ({
        id: admin._id,
        email: admin.email,
        school: admin.school_id.name,
      })),
      mainAdmins: data.usersByRole.mainAdmins,
      districtAdmins: data.usersByRole.districtAdmins,
    },
    totalSchools: data.totalSchools,
    totalStudents: data.totalStudents,
    totalEvents: data.totalEvents,
    totalAttendance: data.totalAttendance,
    attendanceBySchool: data.attendanceBySchool,
  };
}

export async function getUsersBySchoolAndRole(schoolId: string, role: string, token: string): Promise<User[]> {
  const res = await fetch(`${API_URL}/users?school_id=${schoolId}&role=${role}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching users: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const users = await res.json();
  return users.map((user: any) => ({
    id: user._id,
    email: user.email,
    role: user.role,
    school_id: user.school_id?._id,
    school: user.school_id ? { id: user.school_id._id, name: user.school_id.name } : undefined,
    name: user.name,
    createdAt: new Date(user.created_at),
    children: user.children ? user.children.map((child: any) => child._id) : [],
    password: user.password,
    city: user.city,
  }));
}

// In database.ts, update getStudentsBySchool to include email from populated user_id
export async function getStudentsBySchool(schoolId: string, token: string): Promise<Student[]> {
  const res = await fetch(`${API_URL}/students?school_id=${schoolId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching students: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const students = await res.json();
  return students.map((student: any) => ({
    id: student._id,
    name: student.name,
    group: student.group,
    specialty: student.specialty,
    qr_code: student.qr_code,
    school_id: student.school_id,
    createdAt: new Date(student.created_at),
    email: student.user_id?.email,  // Populate email from associated User
    password: student.user_id?.password, // Populate password
  }));
}
export async function getEventsBySchool(schoolId: string, token: string): Promise<Event[]> {
  const res = await fetch(`${API_URL}/events?school_id=${schoolId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching events: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const events = await res.json();
  return events.map((event: any) => ({
    id: event._id,
    name: event.name,
    schedule: event.schedule,
    description: event.description,
    is_active: event.is_active,
    school_id: event.school_id,
    teacher_id: event.teacher_id,
  }));
}

export async function getAttendanceBySchool(schoolId: string, token: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`${API_URL}/attendance?school_id=${schoolId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    studentName: record.studentName,
  }));
}

export async function getSchoolById(id: string, token: string): Promise<School> {
  console.log("Fetching school with ID:", id, "Token:", token.slice(0, 10) + "...");
  const res = await fetch(`${API_URL}/schools/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching school:", {
      status: res.status,
      statusText: res.statusText,
      error: errorData.error,
      schoolId: id,
    });
    throw new Error(`Error fetching school: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const schoolData = await res.json();
  return {
    id: schoolData._id,
    name: schoolData.name,
    city: schoolData.city,
    createdAt: new Date(schoolData.created_at),
  };
}

export async function getCurrentUser(token: string): Promise<User | null> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error fetching current user:", errorData);
    throw new Error(`Error fetching current user: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const user = await res.json();
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    school_id: user.school_id?._id,
    school: user.school_id ? { id: user.school_id._id, name: user.school_id.name } : undefined,
    city: user.city,
    createdAt: new Date(user.created_at),
    children: user.children ? user.children.map((child: any) => child._id) : [],
    name: user.name,
  };
}

export async function deleteEvent(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/events/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error("Error deleting event:", errorData);
    throw new Error(`Error deleting event: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  return res.ok;
}

export async function getAttendanceBySchoolAndPeriod(schoolId: string, period: 'week' | 'month' | 'year' | 'all', token: string): Promise<AttendanceRecord[]> {
  let url = `${API_URL}/attendance?school_id=${schoolId}`;
  if (period !== 'all') {
    url += `&period=${period}`;
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Error fetching attendance: ${res.status} ${res.statusText} - ${errorData.error || "Unknown error"}`);
  }
  const records = await res.json();
  return records.map((record: any) => ({
    id: record._id,
    student_id: record.student_id,
    studentName: record.studentName,
    group: record.group, // ДОБАВЛЕНО
    specialty: record.specialty, // ДОБАВЛЕНО
    event_name: record.event_name,
    timestamp: new Date(record.timestamp),
    scanned_by: record.scanned_by,
    school_id: record.school_id,
  }));
}

export async function updateUser(id: string, data: { email?: string; password?: string; name?: string, city?: string }, token: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update user");
    }
    const updatedUser = await res.json();
    return {
      id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: new Date(updatedUser.createdAt),
      name: updatedUser.name,
      children: updatedUser.children || [],
      city: updatedUser.city,
    };
  } catch (error: any) {
    console.error("Error updating user:", error);
    throw error;
  }
}