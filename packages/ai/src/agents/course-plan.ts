import type { ModelRegistry } from "../registry.js";
import { executeGenerateStructured } from "../execution.js";
import { coursePlanSchema, type CoursePlanOutput } from "../shared/schemas.js";
import type { ExecutionOptions } from "../shared/types.js";
import {
  buildCourseCreationPrompt,
  buildCoursePlanPrompt,
  type CoursePlanPromptParams,
} from "../prompts/course-plan.js";

export type CoursePlanParams = CoursePlanPromptParams;
export { buildCourseCreationPrompt, buildCoursePlanPrompt as buildPrompt };

export async function execute(
  registry: ModelRegistry,
  params: CoursePlanParams,
  options?: ExecutionOptions,
): Promise<CoursePlanOutput> {
  const { system, user } = buildCoursePlanPrompt(params);

  return executeGenerateStructured({
    model: registry.resolve("primary"),
    system,
    prompt: user,
    schema: coursePlanSchema,
    schemaName: "CoursePlan",
    schemaDescription: "A structured course plan with 8-16 lessons",
    maxOutputTokens: options?.maxOutputTokens ?? 32768,
    thinkingBudget: options?.thinkingBudget ?? 16384,
    onProgress: options?.onProgress,
    label: "course-plan",
  });
}
