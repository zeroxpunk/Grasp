import { getClient } from "@/lib/api";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GlobalProgressPage() {
  const client = getClient();
  const [courses, sessionStats] = await Promise.all([
    client.courses.list(),
    client.sessions.stats(),
  ]);

  const totalCompleted = courses.reduce((sum, c) => sum + c.completedLessons, 0);
  const totalLessons = courses.reduce((sum, c) => sum + c.totalLessons, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 mt-14 pb-16 space-y-20">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Progress
        </h1>
        <p className="mt-2 text-zinc-500">
          {totalCompleted} of {totalLessons} lessons across {courses.length} course{courses.length !== 1 ? "s" : ""}
        </p>
      </section>

      <section>
        <h2 className="text-sm text-zinc-500 mb-6">Time</h2>
        <div className="grid grid-cols-4 gap-px bg-zinc-800 border border-zinc-800">
          <div className="bg-black p-4">
            <p className="text-lg font-light text-zinc-100">{sessionStats.totalHours}h</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Total</p>
          </div>
          <div className="bg-black p-4">
            <p className="text-lg font-light text-zinc-100">{sessionStats.totalSessions}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Sessions</p>
          </div>
          <div className="bg-black p-4">
            <p className="text-lg font-light text-zinc-100">{sessionStats.currentStreakDays}d</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Streak</p>
          </div>
          <div className="bg-black p-4">
            <p className="text-lg font-light text-zinc-100">{sessionStats.longestStreakDays}d</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Best streak</p>
          </div>
        </div>
      </section>

      {courses.length > 0 && (
        <section>
          <h2 className="text-sm text-zinc-500 mb-6">Courses</h2>
          <div className="border-t border-zinc-800">
            {courses.map((course) => (
              <Link
                key={course.slug}
                href={`/course/${course.slug}/progress`}
                className="flex items-center justify-between py-4 border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors -mx-3 px-3"
              >
                <div>
                  <p className="text-sm text-zinc-200">{course.title}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {course.completedLessons}/{course.totalLessons} lessons
                  </p>
                </div>
                <div className="shrink-0 ml-8 w-24">
                  <div className="h-px bg-zinc-800 relative">
                    <div
                      className="h-px bg-zinc-100 absolute top-0 left-0"
                      style={{ width: `${Math.max(course.progress, 2)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-700 mt-1 text-right">
                    {course.progress}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
