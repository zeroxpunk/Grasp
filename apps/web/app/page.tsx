import { getClient } from "@/lib/api";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const client = getClient();
  const [courses, sessionStats] = await Promise.all([
    client.courses.list(),
    client.sessions.stats(),
  ]);

  const totalCompleted = courses.reduce((sum, c) => sum + c.completedLessons, 0);
  const totalLessons = courses.reduce((sum, c) => sum + c.totalLessons, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 mt-14 pb-16 space-y-20">
      <section className="flex items-baseline justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-100">
            Courses
          </h1>
          <p className="mt-3 text-lg text-zinc-500">
            {courses.length === 0
              ? "Create your first course to get started."
              : `${courses.length} course${courses.length !== 1 ? "s" : ""} \u00b7 ${totalCompleted}/${totalLessons} lessons complete`}
          </p>
        </div>
        <Link
          href="/course/new"
          className="border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
        >
          Create course
        </Link>
      </section>

      {courses.length > 0 && (
        <section className="grid grid-cols-3 gap-px bg-zinc-800 border border-zinc-800">
          <Stat label="Courses" value={String(courses.length)} />
          <Stat label="Streak" value={`${sessionStats.currentStreakDays}d`} />
          <Stat label="Hours" value={`${sessionStats.totalHours}`} />
        </section>
      )}

      {courses.length > 0 && (
        <section className="space-y-1">
          {courses.map((course) => (
            <Link
              key={course.slug}
              href={`/course/${course.slug}`}
              className="flex items-center justify-between py-5 border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors -mx-3 px-3"
            >
              <div className="min-w-0">
                <p className="text-lg font-medium text-zinc-100 truncate">
                  {course.title}
                </p>
                <p className="text-sm text-zinc-600 mt-1 truncate">
                  {course.description}
                </p>
              </div>
              <div className="shrink-0 ml-8 text-right">
                <p className="text-sm text-zinc-400">
                  {course.completedLessons}/{course.totalLessons}
                </p>
                <div className="mt-1.5 w-24 h-px bg-zinc-800 relative">
                  <div
                    className="h-px bg-zinc-100 absolute top-0 left-0"
                    style={{ width: `${Math.max(course.progress, 2)}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {courses.length === 0 && (
        <section className="py-16 text-center">
          <p className="text-zinc-600">
            No courses yet. Create one to start learning.
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black p-6">
      <p className="text-2xl font-light text-zinc-100">{value}</p>
      <p className="text-xs text-zinc-600 mt-1">{label}</p>
    </div>
  );
}
