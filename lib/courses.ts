import fs from "fs/promises";
import path from "path";
import type { CourseManifest, CourseSummary, LessonEntry, InsightEntry, Exercise, ExerciseProgress } from "./types";
import { normalizeExercises } from "./exercises";

const BASE = process.env.LEARNING_BASE_PATH!;

function coursesDir(): string {
  return path.join(BASE, "courses");
}

function courseDir(slug: string): string {
  return path.join(coursesDir(), slug);
}

function manifestPath(slug: string): string {
  return path.join(courseDir(slug), "course.json");
}

function lessonsDir(slug: string): string {
  return path.join(courseDir(slug), "lessons");
}

function lessonFilename(lesson: LessonEntry): string {
  return `${String(lesson.number).padStart(2, "0")}-${lesson.slug}.md`;
}

function exerciseFilename(lesson: LessonEntry): string {
  return `${String(lesson.number).padStart(2, "0")}-${lesson.slug}.exercises.json`;
}

function exerciseProgressFilename(lesson: LessonEntry): string {
  return `${String(lesson.number).padStart(2, "0")}-${lesson.slug}.exercise-progress.json`;
}

function chatFilename(lesson: LessonEntry): string {
  return `${String(lesson.number).padStart(2, "0")}-${lesson.slug}.chat.json`;
}

export async function listCourses(): Promise<CourseSummary[]> {
  try {
    const entries = await fs.readdir(coursesDir(), { withFileTypes: true });
    const summaries: CourseSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const manifest = await getCourseManifest(entry.name);
        summaries.push(manifestToSummary(manifest));
      } catch {
      }
    }

    return summaries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function getCourseManifest(slug: string): Promise<CourseManifest> {
  const raw = await fs.readFile(manifestPath(slug), "utf-8");
  return JSON.parse(raw);
}

export async function writeCourseManifest(manifest: CourseManifest): Promise<void> {
  await fs.writeFile(
    manifestPath(manifest.slug),
    JSON.stringify(manifest, null, 2) + "\n"
  );
}

function manifestToSummary(m: CourseManifest): CourseSummary {
  const completed = m.lessons.filter((l) => l.status === "completed").length;
  return {
    slug: m.slug,
    title: m.title,
    description: m.description,
    createdAt: m.createdAt,
    totalLessons: m.lessons.length,
    completedLessons: completed,
    progress: m.lessons.length > 0 ? Math.round((completed / m.lessons.length) * 100) : 0,
  };
}

export async function createCourseDirectory(slug: string): Promise<void> {
  await fs.mkdir(courseDir(slug), { recursive: true });
  await fs.mkdir(lessonsDir(slug), { recursive: true });
}

export async function writeCourseContext(slug: string, context: string): Promise<void> {
  await fs.writeFile(path.join(courseDir(slug), "context.md"), context);
}

export async function writeCourseMemory(slug: string, content: string): Promise<void> {
  await fs.writeFile(path.join(courseDir(slug), "memory.md"), content);
}

export async function getLessonContent(
  slug: string,
  lessonNumber: number
): Promise<{ content: string; title: string } | null> {
  const manifest = await getCourseManifest(slug);
  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) return null;

  const filePath = path.join(lessonsDir(slug), lessonFilename(lesson));
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { content, title: lesson.title };
  } catch {
    return null;
  }
}

export async function writeLessonContent(
  slug: string,
  lesson: LessonEntry,
  content: string
): Promise<void> {
  const filePath = path.join(lessonsDir(slug), lessonFilename(lesson));
  await fs.writeFile(filePath, content);
}

export async function getLessonExercises(
  slug: string,
  lessonNumber: number
): Promise<Exercise[]> {
  const manifest = await getCourseManifest(slug);
  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) return [];

  const filePath = path.join(lessonsDir(slug), exerciseFilename(lesson));
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return normalizeExercises(parsed);
  } catch {
    return [];
  }
}

export async function writeLessonExercises(
  slug: string,
  lesson: LessonEntry,
  exercises: Exercise[] | Record<string, unknown>[]
): Promise<void> {
  const filePath = path.join(lessonsDir(slug), exerciseFilename(lesson));
  await fs.writeFile(filePath, JSON.stringify(exercises, null, 2) + "\n");
}

export async function getLessonExerciseProgress(
  slug: string,
  lessonNumber: number
): Promise<Record<number, ExerciseProgress>> {
  const manifest = await getCourseManifest(slug);
  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) return {};

  const filePath = path.join(lessonsDir(slug), exerciseProgressFilename(lesson));
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function updateExerciseProgress(
  slug: string,
  lessonNumber: number,
  updates: Array<{ exerciseId: number; completed: boolean }>
): Promise<void> {
  const manifest = await getCourseManifest(slug);
  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) return;

  const filePath = path.join(lessonsDir(slug), exerciseProgressFilename(lesson));
  let existing: Record<number, ExerciseProgress> = {};
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
  }

  const now = new Date().toISOString();
  for (const u of updates) {
    const current = existing[u.exerciseId];
    if (current?.status === "completed") continue;
    existing[u.exerciseId] = {
      status: u.completed ? "completed" : "attempted",
      attemptedAt: now,
    };
  }

  await fs.writeFile(filePath, JSON.stringify(existing, null, 2) + "\n");
}

export async function getLessonChat(
  slug: string,
  lessonNumber: number
): Promise<Array<{ role: string; content: string; exerciseId?: number }>> {
  const manifest = await getCourseManifest(slug);
  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) return [];

  const filePath = path.join(lessonsDir(slug), chatFilename(lesson));
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveLessonChat(
  slug: string,
  lessonNumber: number,
  messages: Array<{ role: string; content: string; exerciseId?: number }>
): Promise<void> {
  const manifest = await getCourseManifest(slug);
  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (!lesson) return;

  const filePath = path.join(lessonsDir(slug), chatFilename(lesson));
  await fs.writeFile(filePath, JSON.stringify(messages, null, 2) + "\n");
}

export async function getAdjacentLessons(
  manifest: CourseManifest,
  lessonNumber: number
): Promise<{ prev: LessonEntry | null; next: LessonEntry | null }> {
  const idx = manifest.lessons.findIndex((l) => l.number === lessonNumber);
  return {
    prev: idx > 0 ? manifest.lessons[idx - 1] : null,
    next: idx < manifest.lessons.length - 1 ? manifest.lessons[idx + 1] : null,
  };
}

export function getMasteryLabel(level: number): string {
  switch (level) {
    case 0: return "Not started";
    case 1: return "Introduced";
    case 2: return "Practiced";
    case 3: return "Confident";
    case 4: return "Can teach";
    default: return "Unknown";
  }
}

export async function getCourseMemory(slug: string): Promise<string> {
  try {
    return await fs.readFile(path.join(courseDir(slug), "memory.md"), "utf-8");
  } catch {
    return "";
  }
}

export async function appendToCourseMemory(slug: string, content: string): Promise<void> {
  const memPath = path.join(courseDir(slug), "memory.md");
  let existing = "";
  try {
    existing = await fs.readFile(memPath, "utf-8");
  } catch {
  }
  await fs.writeFile(memPath, existing.trimEnd() + "\n\n" + content + "\n");
}

export async function getGlobalMemory(): Promise<string> {
  try {
    return await fs.readFile(path.join(BASE, "memory.md"), "utf-8");
  } catch {
    return "";
  }
}

export async function getCourseContext(slug: string): Promise<string> {
  try {
    return await fs.readFile(path.join(courseDir(slug), "context.md"), "utf-8");
  } catch {
    return "";
  }
}

export async function getCourseInsights(slug: string): Promise<InsightEntry[]> {
  const memory = await getCourseMemory(slug);
  if (!memory) return [];

  const insights: InsightEntry[] = [];
  const lines = memory.split("\n");
  let currentDate = "";

  for (const line of lines) {
    const dateMatch = line.match(/^## Insights — (\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }
    const match = line.match(
      /^-\s*\*\*(strength|gap|preference|pattern)\*\*:\s*(.+)$/
    );
    if (match) {
      insights.push({
        date: currentDate,
        kind: match[1] as InsightEntry["kind"],
        observation: match[2].trim(),
      });
    }
  }

  return insights.reverse();
}

export async function updateLessonStatus(
  slug: string,
  lessonNumber: number,
  status: LessonEntry["status"]
): Promise<void> {
  const manifest = await getCourseManifest(slug);
  const lesson = manifest.lessons.find((l) => l.number === lessonNumber);
  if (lesson) {
    lesson.status = status;
    await writeCourseManifest(manifest);
  }
}

export async function updateMastery(
  slug: string,
  updates: Record<string, number>
): Promise<void> {
  const manifest = await getCourseManifest(slug);
  for (const [key, level] of Object.entries(updates)) {
    manifest.mastery[key] = level;
  }
  await writeCourseManifest(manifest);
}

export async function appendInsightsToMemory(
  slug: string,
  insights: Array<{ kind: string; observation: string }>
): Promise<void> {
  if (insights.length === 0) return;
  const today = new Date().toISOString().slice(0, 10);
  const lines = insights
    .map((i) => `- **${i.kind}**: ${i.observation}`)
    .join("\n");
  await appendToCourseMemory(slug, `## Insights — ${today}\n\n${lines}`);
}
