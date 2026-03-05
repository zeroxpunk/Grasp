import { z } from "zod";

export const EXERCISE_TYPES = [
  "text", "quiz", "flashcard", "ordering", "matching",
  "code-completion", "bug-hunt", "output-prediction", "tradeoff-analysis",
] as const;

export const exerciseItemSchema = z.object({
  id: z.number().describe("Sequential exercise ID starting from 1"),
  type: z.enum(EXERCISE_TYPES).describe("Exercise type"),
  title: z.string().describe("Short exercise title"),
  prompt: z.string().describe("The question or task for the learner"),
  code: z.string().optional().describe("Code snippet (required for bug-hunt, output-prediction; optional for text, tradeoff-analysis, code-completion)"),
  language: z.string().optional().describe("Language for syntax highlighting (e.g. 'rust', 'typescript')"),
  hints: z.array(z.string()).optional().describe("Progressive hints"),
  choices: z.array(z.object({ label: z.string(), correct: z.boolean() })).optional()
    .describe("Quiz: exactly 4 choices, one with correct=true"),
  back: z.string().optional().describe("Flashcard: answer/definition shown on back"),
  items: z.array(z.string()).optional().describe("Ordering: items in correct order (client shuffles)"),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional()
    .describe("Matching: pairs to connect (client shuffles both sides)"),
  codeTemplate: z.string().optional().describe("Code-completion: code with ___BLANK___ markers"),
  blanks: z.array(z.string()).optional().describe("Code-completion: correct values for each blank"),
  bugLine: z.number().optional().describe("Bug-hunt: 1-based line number containing the bug"),
  bugExplanation: z.string().optional().describe("Bug-hunt: explanation of the bug"),
  expectedOutput: z.string().optional().describe("Output-prediction: expected program output"),
});

export const exerciseSchema = z.array(exerciseItemSchema)
  .describe("3-5 exercises for the lesson, mixing types across cognitive tiers");

export const coursePlanSchema = z.object({
  title: z.string().describe("Course title"),
  slug: z.string().describe("URL-friendly course slug, lowercase with hyphens"),
  description: z.string().describe("One-line course description"),
  lessons: z
    .array(
      z.object({
        number: z.number().describe("Lesson number, starting from 1"),
        slug: z.string().describe("URL-friendly lesson slug"),
        title: z.string().describe("Lesson title"),
        concepts: z
          .array(z.string())
          .describe("Key concepts covered in this lesson"),
      })
    )
    .describe("8-16 lessons in progressive order"),
});

export type CoursePlanOutput = z.infer<typeof coursePlanSchema>;

export const courseCreationSchema = z.object({
  title: z.string().describe("Course title"),
  slug: z.string().describe("URL-friendly course slug, lowercase with hyphens"),
  description: z.string().describe("One-line course description"),
  lessons: z
    .array(
      z.object({
        number: z.number().describe("Lesson number, starting from 1"),
        slug: z.string().describe("URL-friendly lesson slug"),
        title: z.string().describe("Lesson title"),
        concepts: z
          .array(z.string())
          .describe("Key concepts covered in this lesson"),
      })
    )
    .describe("8-16 lessons in progressive order"),
  lessonContents: z
    .array(
      z.object({
        lessonNumber: z.number().describe("Lesson number this content belongs to (1 or 2)"),
        content: z.string().describe("Full markdown content for the lesson"),
        exercises: exerciseSchema,
      })
    )
    .describe("Full content for lessons 1 and 2 only"),
});

export type CourseCreationOutput = z.infer<typeof courseCreationSchema>;

export const evaluationSchema = z.object({
  lessonComplete: z
    .boolean()
    .describe("Whether the lesson is complete based on concept coverage and demonstrated understanding"),
  masteryUpdates: z
    .array(
      z.object({
        concept: z.string().describe("Concept name matching the course plan"),
        level: z
          .number()
          .describe("Mastery level 0-4: 0=not started, 1=introduced, 2=practiced, 3=confident, 4=can teach"),
      })
    )
    .describe("Concept mastery level updates. Only include concepts that were actually covered."),
  insights: z
    .array(
      z.object({
        kind: z.enum(["strength", "gap", "preference", "pattern"]).describe(
          "strength: something the learner understands well. gap: a concept they struggle with. preference: how they learn best. pattern: recurring behavior."
        ),
        observation: z.string().describe("A concise observation about the learner"),
      })
    )
    .describe("Insights about the learner from this session"),
  recommendation: z
    .enum(["advance", "repeat", "review"])
    .describe("advance: lesson complete, move forward. repeat: significant gaps, redo. review: mostly understood, review weak points."),
  planChanges: z
    .array(
      z.object({
        action: z.enum(["add", "remove", "skip"]),
        lessonTitle: z.string().optional().describe("Title for new or target lesson"),
        concepts: z.array(z.string()).optional().describe("Concepts for the new lesson"),
        reason: z.string().describe("Why this change is needed"),
        afterLesson: z.number().optional().describe("Insert after this lesson number"),
      })
    )
    .optional()
    .describe("Optional changes to the course plan based on learner progress"),
  exercisesAttempted: z
    .array(
      z.object({
        exerciseId: z.number().describe("Exercise ID"),
        completed: z.boolean().describe("Whether the exercise was completed successfully"),
      })
    )
    .optional()
    .describe("Exercises that were attempted during the session, with completion status"),
});

export type EvaluationOutput = z.infer<typeof evaluationSchema>;
