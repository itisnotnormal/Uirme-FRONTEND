// app/api/events-data/route.ts
import { getAllEvents, getAttendanceByEvent, addEvent, toggleEventActive } from "@/lib/database";
import { NextResponse } from "next/server";
import type { Event } from "@/lib/types";

export async function GET() {
  try {
    const events = await getAllEvents();
    const attendancePromises = events.map(async (event) => ({
      eventName: event.name,
      attendance: await getAttendanceByEvent(event.name),
    }));
    const attendanceData = await Promise.all(attendancePromises);
    const attendanceMap = Object.fromEntries(
      attendanceData.map(({ eventName, attendance }) => [eventName, attendance]),
    );
    return NextResponse.json({ success: true, events, attendanceMap });
  } catch (error) {
    console.error("Error fetching events data:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "addEvent") {
      const eventToAdd: Omit<Event, "id"> = {
        name: body.name,
        date: new Date(body.date),
        description: body.description,
        isActive: body.isActive,
      };
      const addedEvent = await addEvent(eventToAdd);
      if (!addedEvent) {
        return NextResponse.json({ success: false, error: "Failed to add event" }, { status: 500 });
      }
      return NextResponse.json({ success: true, event: addedEvent });
    } else if (body.action === "toggleEventActive") {
      const success = await toggleEventActive(body.eventId, body.isActive);
      if (!success) {
        return NextResponse.json({ success: false, error: "Failed to toggle event" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}