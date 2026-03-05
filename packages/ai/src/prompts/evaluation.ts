import type { CourseManifest, Exercise, ExerciseProgress } from "../shared/types.js";

export interface EvaluationPromptParams {
  manifest: CourseManifest;
  globalMemory: string | null;
  courseMemory: string | null;
  exercises: Exercise[];
  exerciseProgress: Record<number, ExerciseProgress>;
  conversationSummary: string;
  lessonNumber: number;
}

export function buildEvaluationPrompt(
  params: EvaluationPromptParams,
): { system: string; user: string } {
  const {
    manifest,
    globalMemory,
    courseMemory,
    exercises,
    exerciseProgress,
    conversationSummary,
    lessonNumber,
  } = params;

  const lesson = manifest.lessons.find((entry) => entry.number === lessonNumber);
  if (!lesson) throw new Error(`Lesson ${lessonNumber} not found in ${manifest.slug}`);

  const lessonPlan = manifest.lessons
    .map((entry) => `  ${entry.number}. ${entry.title} [${entry.status}] — concepts: ${entry.concepts.join(", ")}`)
    .join("\n");

  const masteryText = Object.entries(manifest.mastery)
    .map(([concept, score]) => `  ${concept}: ${score}`)
    .join("\n");

  const exerciseProgressText = Object.keys(exerciseProgress).length > 0
    ? `\n<exercise-progress>\n${JSON.stringify(exerciseProgress, null, 2)}\n</exercise-progress>\n\nNote: Some exercises may have been self-graded by the interactive UI (quiz, flashcard, ordering, matching, code-completion, bug-hunt, output-prediction). Their results are already in the exercise-progress data above. Do NOT re-evaluate self-graded exercises — only evaluate chat-graded exercises (text, tradeoff-analysis) from the session conversation.`
    : "";

  const system = `You are the Course Director for "${manifest.title}". Your role is to evaluate a completed learning session and make decisions about the learner's progress.

## Learner Profile
<global-memory>
${globalMemory || "No global profile available."}
</global-memory>

## Course Plan
<lesson-plan>
${lessonPlan}
</lesson-plan>

## Current Mastery Levels
<mastery>
${masteryText || "No mastery data yet."}
</mastery>

## Course Memory (insights, patterns, learning preferences)
<course-memory>
${courseMemory || "No course memory yet."}
</course-memory>

## Session Details
**Lesson ${lessonNumber}:** ${lesson.title}
**Concepts:** ${lesson.concepts.join(", ")}

<session-summary>
${conversationSummary}
</session-summary>
${exercises.length > 0 ? `
<exercises>
${JSON.stringify(exercises, null, 2)}
</exercises>
` : ""}${exerciseProgressText}
## Mastery Scale
- 0: not started — never encountered this concept
- 1: introduced — seen it, but cannot use it independently
- 2: practiced — can use with reference, makes occasional mistakes
- 3: confident — can use independently, understands edge cases
- 4: can teach — deep understanding, can explain to others

## Instructions
Analyze the session and produce a structured evaluation.

1. **Mastery Updates**: Based on what the learner demonstrated, which concepts should have their mastery levels updated? Only update concepts that were actually covered. Don't inflate levels. Keys must match concept names from the course plan.

2. **Insights**: Extract insights about the learner from this session. Each insight has a kind:
   - **strength**: something the learner clearly understands well
   - **gap**: a concept or skill they struggle with
   - **preference**: how they learn best (e.g. "understands better with Kotlin analogies", "prefers code-first explanations", "asks good clarifying questions")
   - **pattern**: recurring behavior (e.g. "rushes through exercises without reading fully", "strong at reasoning about types", "needs visual aids for memory concepts")
   Be specific and actionable. These insights will be used to personalize future lessons.

3. **Lesson Completion**: A lesson is complete when:
   - Key concepts have been covered
   - The learner demonstrated at least mastery level 2 on core concepts
   - Exercises were attempted and largely correct
   - No critical misunderstandings remain

4. **Recommendation**:
   - "advance" — lesson complete, move forward
   - "repeat" — significant gaps, redo with different examples
   - "review" — mostly understood, review weak points before advancing

5. **Plan Changes** (optional): Based on the learner's progress, propose changes to the course plan:
   - Add a remediation lesson if the learner is struggling
   - Skip upcoming lessons if mastery is already high
   - Add deeper dives if the learner shows strong interest

6. **Exercises Attempted**: Identify which exercises from the exercises list were attempted during the session, and whether the learner completed them successfully. Per-type completion standards:
   - **quiz**: Correct if they selected the right answer (check exercise-progress for self-graded result).
   - **flashcard**: Completed if they marked "I knew this" (check exercise-progress).
   - **ordering**: Correct if all items in correct order (check exercise-progress).
   - **matching**: Correct if all pairs matched (check exercise-progress).
   - **code-completion**: Correct if all blanks filled correctly (check exercise-progress).
   - **bug-hunt**: Correct if they identified the right line (check exercise-progress).
   - **output-prediction**: Correct if their prediction matched (check exercise-progress).
   - **text**: Evaluate reasoning quality from the chat. Accept directionally correct.
   - **tradeoff-analysis**: Evaluate whether they considered multiple perspectives. Accept directionally correct.
   For self-graded types, trust the exercise-progress data. Only add exercises to exercisesAttempted that were discussed in chat AND not already recorded in exercise-progress.

Never use emojis.`;

  const user = `Evaluate the session for Lesson ${lessonNumber}: "${lesson.title}".`;

  return { system, user };
}
