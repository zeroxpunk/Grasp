import fs from "fs/promises";
import path from "path";
import type { Session, SessionStats } from "./types";

const BASE = process.env.LEARNING_BASE_PATH!;
const SESSIONS_PATH = path.join(BASE, "sessions.json");

export async function getSessions(): Promise<Session[]> {
  try {
    const raw = await fs.readFile(SESSIONS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeSessions(sessions: Session[]): Promise<void> {
  await fs.writeFile(SESSIONS_PATH, JSON.stringify(sessions, null, 2) + "\n");
}

export async function startSession(courseSlug?: string): Promise<Session> {
  const sessions = await getSessions();

  const active = sessions.findIndex((s) => s.end === null);
  if (active !== -1) {
    sessions[active].end = new Date().toISOString();
  }

  const session: Session = {
    start: new Date().toISOString(),
    end: null,
    courseSlug,
  };
  sessions.push(session);
  await writeSessions(sessions);
  return session;
}

export async function endSession(): Promise<Session | null> {
  const sessions = await getSessions();
  const active = sessions.findIndex((s) => s.end === null);

  if (active === -1) return null;

  sessions[active].end = new Date().toISOString();
  await writeSessions(sessions);
  return sessions[active];
}

export async function getSessionStats(courseSlug?: string): Promise<SessionStats> {
  const allSessions = await getSessions();
  const sessions = courseSlug
    ? allSessions.filter((s) => s.courseSlug === courseSlug)
    : allSessions;
  const completed = sessions.filter((s) => s.end !== null);

  let totalMs = 0;
  for (const s of completed) {
    totalMs += new Date(s.end!).getTime() - new Date(s.start).getTime();
  }
  const totalHours = Math.round((totalMs / 3600000) * 10) / 10;

  const days = new Set<string>();
  for (const s of sessions) {
    days.add(s.start.slice(0, 10));
  }
  const sortedDays = [...days].sort();

  const today = new Date().toISOString().slice(0, 10);
  let currentStreak = 0;
  const checkDate = new Date(today);

  if (!days.has(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (!days.has(checkDate.toISOString().slice(0, 10))) {
      currentStreak = 0;
    } else {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      while (days.has(checkDate.toISOString().slice(0, 10))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  } else {
    currentStreak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
    while (days.has(checkDate.toISOString().slice(0, 10))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  let longestStreak = 0;
  let streak = 0;
  let prev: Date | null = null;
  for (const day of sortedDays) {
    const d = new Date(day);
    if (prev && d.getTime() - prev.getTime() === 86400000) {
      streak++;
    } else {
      streak = 1;
    }
    longestStreak = Math.max(longestStreak, streak);
    prev = d;
  }

  return {
    totalHours,
    currentStreakDays: currentStreak,
    longestStreakDays: longestStreak,
    lastSessionDate: sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : null,
    activeSession: sessions.some((s) => s.end === null),
    totalSessions: sessions.length,
  };
}

