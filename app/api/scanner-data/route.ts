import { getActiveEvents, getAllAttendanceRecords } from "@/lib/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const activeEvents = await getActiveEvents();
    const records = await getAllAttendanceRecords();
    console.log("API /scanner-data: Active events:", activeEvents); // Debug log
    return NextResponse.json({ success: true, activeEvents, records });
  } catch (error: any) {
    console.error("Error fetching scanner data:", error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch scanner data" }, { status: 500 });
  }
}