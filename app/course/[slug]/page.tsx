import { getCourseManifest, getLessonExercises, getLessonExerciseProgress } from "@/lib/courses";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CourseOverviewPage({ params }: Props) {
  const { slug } = await params;
  const manifest = await getCourseManifest(slug);

  const completed = manifest.lessons.filter((l) => l.status === "completed").length;
  const progress = manifest.lessons.length > 0
    ? Math.round((completed / manifest.lessons.length) * 100)
    : 0;

  // Load exercise counts for accessible lessons
  const exerciseStats: Record<number, { total: number; completed: number }> = {};
  await Promise.all(
    manifest.lessons
      .filter((l) => l.status !== "not_created")
      .map(async (l) => {
        const [exercises, progress] = await Promise.all([
          getLessonExercises(slug, l.number),
          getLessonExerciseProgress(slug, l.number),
        ]);
        if (exercises.length > 0) {
          const completedCount = Object.values(progress).filter(
            (p) => p.status === "completed"
          ).length;
          exerciseStats[l.number] = { total: exercises.length, completed: completedCount };
        }
      })
  );

  const nextLesson = manifest.lessons.find(
    (l) => l.status === "not_started" || l.status === "started" || l.status === "failed"
  );

  return (
    <div className="mx-auto max-w-7xl px-6 mt-10 pb-16 space-y-16">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          {manifest.title}
        </h1>
        <p className="mt-2 text-zinc-500">{manifest.description}</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-800 relative">
            <div
              className="h-px bg-zinc-100 absolute top-0 left-0 transition-all duration-700"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
          </div>
          <span className="text-sm text-zinc-500">{progress}%</span>
        </div>
      </section>

      {nextLesson && (
        <section>
          <p className="text-sm text-zinc-500 mb-3">Continue with</p>
          <Link
            href={`/course/${slug}/${nextLesson.number}`}
            className="inline-block border border-zinc-700 px-6 py-3 text-lg font-medium text-zinc-100 hover:text-white hover:border-zinc-500 transition-colors"
          >
            {nextLesson.title}
          </Link>
          <p className="mt-2 text-sm text-zinc-600">
            Lesson {nextLesson.number}
            {nextLesson.status === "failed" && " \u00b7 retry"}
          </p>
        </section>
      )}

      <section>
        <h2 className="text-sm text-zinc-500 mb-6">Lessons</h2>
        <div className="border-t border-zinc-800">
          {manifest.lessons.map((lesson) => {
            const isAccessible =
              lesson.status !== "not_created";

            return (
              <div
                key={lesson.number}
                className="flex items-center justify-between py-4 border-b border-zinc-800/50"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-sm text-zinc-700 w-6 text-right shrink-0">
                    {String(lesson.number).padStart(2, "0")}
                  </span>
                  {isAccessible ? (
                    <Link
                      href={`/course/${slug}/${lesson.number}`}
                      className="text-sm text-zinc-200 hover:text-zinc-100 transition-colors truncate"
                    >
                      {lesson.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-zinc-600 truncate">
                      {lesson.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {exerciseStats[lesson.number] && (
                    <span className="text-[11px] text-zinc-700">
                      {exerciseStats[lesson.number].completed}/{exerciseStats[lesson.number].total} exercises
                    </span>
                  )}
                  <StatusBadge status={lesson.status} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <span className="text-xs text-zinc-600">done</span>;
    case "started":
      return <span className="text-xs text-zinc-500">in progress</span>;
    case "not_started":
      return <span className="text-xs text-zinc-700">ready</span>;
    case "failed":
      return <span className="text-xs text-amber-700">retry</span>;
    case "not_created":
      return <span className="text-xs text-zinc-800">locked</span>;
    default:
      return null;
  }
}
