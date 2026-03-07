import { getServerClient } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const KIND_LABELS: Record<string, { label: string; color: string }> = {
  strength: { label: "Strength", color: "text-emerald-600" },
  gap: { label: "Gap", color: "text-red-800" },
  preference: { label: "Preference", color: "text-blue-600" },
  pattern: { label: "Pattern", color: "text-amber-600" },
};

export default async function CourseInsightsPage({ params }: Props) {
  const { slug } = await params;
  const client = await getServerClient();
  const [insights, manifest] = await Promise.all([
    client.insights.list(slug),
    client.courses.get(slug),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 mt-10 pb-16 space-y-16">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Insights
        </h1>
        <p className="mt-2 text-zinc-500">
          What the tutor has learned about you while teaching {manifest.title}.
        </p>
      </section>

      {insights.length === 0 ? (
        <section>
          <p className="text-zinc-700 text-sm">
            Nothing here yet. Insights will appear as you complete lessons.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {insights.map((ins) => {
            const meta = KIND_LABELS[ins.kind] || { label: ins.kind, color: "text-zinc-500" };
            return (
              <div
                key={ins.id}
                className="flex items-baseline gap-3 py-3 border-b border-zinc-800/50"
              >
                <span className={`text-[11px] font-medium uppercase tracking-wide shrink-0 w-20 ${meta.color}`}>
                  {meta.label}
                </span>
                <p className="text-sm text-zinc-400 flex-1">{ins.observation}</p>
                <span className="text-[11px] text-zinc-700 shrink-0">
                  {new Date(ins.createdAt).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
