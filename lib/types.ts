export type UserRole = 'teacher' | 'parent' | 'student' | 'school_admin' | 'main_admin' | 'district_admin';

// Update the Student interface in types to include email
export interface Student {
  id: string;
  name: string;
  group: string;
  specialty: string;
  qr_code: string;
  school_id: string;
  createdAt: Date;
  email?: string;  // Added to hold the populated email from User
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  studentName: string;
  event_name: string;
  timestamp: Date;
  scanned_by: string;
}

export interface Event {
  id: string;
  name: string;
  schedule: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }[];
  description?: string;
  is_active: boolean;
  school_id: string;
  teacher_id?: string;
}

export interface School {
  id: string;
  name: string;
  city: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  school_id?: string;
  school?: { id: string; name: string };
  city?: string;
  createdAt: Date;
  children?: string[];
  name?: string;
}

export interface ParentProfile {
  id: string;
  email: string;
  role: string;
  school_id?: string;
  name?: string;
  createdAt: Date;
  children?: string[];
}

export interface TeacherProfile {
  id: string;
  email: string;
  role: string;
  school_id?: string;
  name?: string;
  createdAt: Date;
}

export interface AnalyticsData {
  totalUsers: number;
  usersByRole: {
    teachers: number;
    parents: number;
    students: number;
    schoolAdmins: { id: string; email: string; school: string | null }[];
    mainAdmins: number;
    districtAdmins: number;
  };
  totalSchools: number;
  totalStudents: number;
  totalEvents: number;
  totalAttendance: number;
  attendanceBySchool: { school: string; attendanceCount: number }[];
}