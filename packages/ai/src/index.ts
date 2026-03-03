import { createModelRegistry, type RegistryConfig, type ModelRegistry } from "./registry.js";
import { streamEventsToSSE } from "./execution.js";
import * as researchAgent from "./agents/research.js";
import * as coursePlanAgent from "./agents/course-plan.js";
import * as lessonContentAgent from "./agents/lesson-content.js";
import * as exerciseGenAgent from "./agents/exercise-generation.js";
import * as evaluationAgent from "./agents/evaluation.js";
import * as tutorAgent from "./agents/tutor.js";
import * as contentReviewAgent from "./agents/content-review.js";
import * as titleEnhancementAgent from "./agents/title-enhancement.js";
import * as imageGenerationAgent from "./agents/image-generation.js";
import * as promptLibrary from "./prompts/index.js";
import type { CoursePlanOutput, EvaluationOutput } from "./shared/schemas.js";
import type { Exercise, StreamEvent, ExecutionOptions } from "./shared/types.js";

export interface GraspAI {
  research(params: researchAgent.ResearchParams): Promise<string>;
  planCourse(params: coursePlanAgent.CoursePlanParams, opts?: ExecutionOptions): Promise<CoursePlanOutput>;
  generateInitialLessonContent(params: lessonContentAgent.InitialLessonParams, opts?: ExecutionOptions): Promise<string>;
  generateLessonContent(params: lessonContentAgent.OnDemandLessonParams, opts?: ExecutionOptions & { webSearch?: boolean }): Promise<string>;
  generateExercises(params: exerciseGenAgent.ExerciseGenParams, opts?: ExecutionOptions): Promise<Exercise[]>;
  evaluate(params: evaluationAgent.EvaluationParams, opts?: ExecutionOptions): Promise<EvaluationOutput>;
  tutor: {
    stream(params: tutorAgent.TutorParams, callbacks?: tutorAgent.TutorCallbacks): AsyncGenerator<StreamEvent>;
  };
  images: {
    generateDiagram(params: imageGenerationAgent.ImageGenerationParams): Promise<imageGenerationAgent.GeneratedImage | null>;
  };
  reviewContent(params: { content: string }, opts?: ExecutionOptions): Promise<string>;
  enhanceTitles(params: titleEnhancementAgent.TitleEnhancementParams): Promise<string[]>;
  prompts: {
    research: typeof promptLibrary.buildResearchPrompt;
    coursePlan: typeof promptLibrary.buildCoursePlanPrompt;
    courseCreation: typeof promptLibrary.buildCourseCreationPrompt;
    initialLessonContent: typeof promptLibrary.buildInitialLessonPrompt;
    onDemandLessonContent: typeof promptLibrary.buildOnDemandLessonPrompt;
    exerciseGeneration: typeof promptLibrary.buildExerciseGenerationPrompt;
    evaluation: typeof promptLibrary.buildEvaluationPrompt;
    tutor: typeof promptLibrary.buildTutorSystemPrompt;
    tutorConversation: typeof promptLibrary.buildTutorConversationPrompt;
    contentReview: typeof promptLibrary.buildContentReviewPrompt;
    titleEnhancement: typeof promptLibrary.buildTitleEnhancementPrompt;
    diagramImage: typeof promptLibrary.buildDiagramImagePrompt;
    courseMemory: typeof promptLibrary.buildInitialCourseMemory;
  };
  registry: ModelRegistry;
}

export function createAI(config: RegistryConfig): GraspAI {
  const registry = createModelRegistry(config);

  return {
    research: (params) => researchAgent.execute(registry, params),
    planCourse: (params, opts) => coursePlanAgent.execute(registry, params, opts),
    generateInitialLessonContent: (params, opts) => lessonContentAgent.executeInitial(registry, params, opts),
    generateLessonContent: (params, opts) => lessonContentAgent.executeOnDemand(registry, params, opts),
    generateExercises: (params, opts) => exerciseGenAgent.execute(registry, params, opts),
    evaluate: (params, opts) => evaluationAgent.execute(registry, params, opts),
    tutor: {
      stream: (params, callbacks) => tutorAgent.execute(registry, params, callbacks),
    },
    images: {
      generateDiagram: (params) => imageGenerationAgent.execute(registry, params),
    },
    reviewContent: (params, opts) => contentReviewAgent.execute(registry, params, opts),
    enhanceTitles: (params) => titleEnhancementAgent.execute(registry, params),
    prompts: {
      research: promptLibrary.buildResearchPrompt,
      coursePlan: promptLibrary.buildCoursePlanPrompt,
      courseCreation: promptLibrary.buildCourseCreationPrompt,
      initialLessonContent: promptLibrary.buildInitialLessonPrompt,
      onDemandLessonContent: promptLibrary.buildOnDemandLessonPrompt,
      exerciseGeneration: promptLibrary.buildExerciseGenerationPrompt,
      evaluation: promptLibrary.buildEvaluationPrompt,
      tutor: promptLibrary.buildTutorSystemPrompt,
      tutorConversation: promptLibrary.buildTutorConversationPrompt,
      contentReview: promptLibrary.buildContentReviewPrompt,
      titleEnhancement: promptLibrary.buildTitleEnhancementPrompt,
      diagramImage: promptLibrary.buildDiagramImagePrompt,
      courseMemory: promptLibrary.buildInitialCourseMemory,
    },
    registry,
  };
}

export type {
  LessonStatus,
  LessonEntry,
  CourseManifest,
  ExerciseType,
  Exercise,
  ExerciseProgress,
  TextExercise,
  QuizExercise,
  FlashcardExercise,
  OrderingExercise,
  MatchingExercise,
  CodeCompletionExercise,
  BugHuntExercise,
  OutputPredictionExercise,
  TradeoffExercise,
  StreamEvent,
  ExecutionOptions,
} from "./shared/types.js";

export {
  exerciseItemSchema,
  exerciseSchema,
  coursePlanSchema,
  courseCreationSchema,
  evaluationSchema,
  EXERCISE_TYPES,
} from "./shared/schemas.js";
export type { CoursePlanOutput, CourseCreationOutput, EvaluationOutput } from "./shared/schemas.js";

export { normalizeExercise, normalizeExercises } from "./shared/exercises.js";
export { createLogger } from "./shared/logger.js";
export { streamEventsToSSE } from "./execution.js";

export { createModelRegistry } from "./registry.js";
export type { ModelRole, RegistryConfig, ModelRegistry } from "./registry.js";

export type { ResearchParams } from "./agents/research.js";
export type { CoursePlanParams } from "./agents/course-plan.js";
export type { InitialLessonParams, OnDemandLessonParams } from "./agents/lesson-content.js";
export type { ExerciseGenParams } from "./agents/exercise-generation.js";
export type { EvaluationParams } from "./agents/evaluation.js";
export type { TutorParams, TutorCallbacks } from "./agents/tutor.js";
export type { TitleEnhancementParams } from "./agents/title-enhancement.js";
export type { ImageGenerationParams, GeneratedImage } from "./agents/image-generation.js";

export * from "./prompts/index.js";
