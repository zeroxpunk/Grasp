import { getServerClient } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

function getMasteryLabel(level: number): string {
  switch (level) {
    case 0: return "Not started";
    case 1: return "Beginner";
    case 2: return "Developing";
    case 3: return "Proficient";
    case 4: return "Mastered";
    default: return "Unknown";
  }
}

export default async function CourseProgressPage({ params }: Props) {
  const { slug } = await params;
  const client = await getServerClient();
  const [manifest, sessionStats] = await Promise.all([
    client.courses.get(slug),
    client.sessions.stats(),
  ]);

  const completed = manifest.lessons.filter((l) => l.status === "completed").length;
  const masteryEntries = Object.entries(manifest.mastery);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8 sm:mt-10 pb-16 space-y-10 sm:space-y-16">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Progress
        </h1>
        <p className="mt-2 text-zinc-500">
          {completed} of {manifest.lessons.length} lessons &middot;{" "}
          {sessionStats.totalHours}h studied &middot;{" "}
          {sessionStats.currentStreakDays}d streak
          {sessionStats.activeSession && (
            <span className="text-zinc-400"> &middot; session active</span>
          )}
        </p>
      </section>

      <section>
        <h2 className="text-sm text-zinc-500 mb-6">Time</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800">
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

      {masteryEntries.length > 0 && (
        <section>
          <h2 className="text-sm text-zinc-500 mb-6">Mastery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800">
            {masteryEntries.map(([key, level]) => (
              <div key={key} className="bg-black p-4">
                <div className="flex items-center gap-2 mb-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-px flex-1 ${
                        i < level ? "bg-zinc-100" : "bg-zinc-800"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-500 leading-tight">
                  {formatKey(key)}
                </p>
                <p className="text-[10px] text-zinc-700 mt-0.5">
                  {getMasteryLabel(level)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
