import { insightQueries } from '@grasp/db'

export async function listInsights(courseId: string) {
  const entries = await insightQueries.listByCourse(courseId)

  return entries.map((e) => ({
    id: e.id,
    kind: e.kind,
    observation: e.observation,
    createdAt: e.createdAt.toISOString(),
  }))
}
