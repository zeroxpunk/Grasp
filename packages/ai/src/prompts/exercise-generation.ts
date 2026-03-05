export interface ExerciseGenerationPromptParams {
  lessonTitle: string;
  concepts: string[];
  lessonContent: string;
  lessonNumber: number;
  totalLessons: number;
  mastery: Record<string, number>;
  courseTitle: string;
  courseDescription: string;
  courseMemory?: string;
}

export function buildExerciseGenerationPrompt(
  params: ExerciseGenerationPromptParams,
): { system: string; user: string } {
  const {
    lessonTitle,
    concepts,
    lessonContent,
    lessonNumber,
    totalLessons,
    mastery,
    courseTitle,
    courseDescription,
    courseMemory,
  } = params;

  const masteryValues = Object.values(mastery);
  const avgMastery = masteryValues.length > 0
    ? masteryValues.reduce((total, value) => total + value, 0) / masteryValues.length
    : 0;

  let difficulty: string;
  let exerciseCount: string;
  let typeGuidance: string;

  if (lessonNumber <= 3 || avgMastery < 1.5) {
    difficulty = "early";
    exerciseCount = "3-4";
    typeGuidance = "Favor quiz, flashcard, ordering, code-completion. Include at least 1 recognition-tier exercise. Minimize tradeoff-analysis and bug-hunt.";
  } else if (lessonNumber <= 8 || avgMastery <= 2.5) {
    difficulty = "mid";
    exerciseCount = "4-5";
    typeGuidance = "Favor code-completion, matching, output-prediction, text. Mix recognition and production tiers. Include at least 1 production-tier exercise.";
  } else {
    difficulty = "late";
    exerciseCount = "4-5";
    typeGuidance = "Favor bug-hunt, tradeoff-analysis, text. Minimize flashcard and quiz. Include at least 1 synthesis-tier exercise. Challenge the learner.";
  }

  const system = `You are an exercise designer for the lesson "${lessonTitle}" (Lesson ${lessonNumber} of ${totalLessons}).

## Exercise Types Available

### Recognition-tier (identify correct information)
- **quiz**: Multiple choice with 4 options, exactly 1 correct. Required fields: choices (array of {label, correct}). Distractors must be plausible misconceptions, not obviously wrong.
- **flashcard**: Card with prompt on front, answer on back. Required fields: back (string). Good for definitions, key terms, quick recall.

### Sequencing-tier (understand process and structure)
- **ordering**: Items that must be put in correct order. Required fields: items (string array in correct order; client shuffles). The sequence must be unambiguous.
- **matching**: Pairs to connect. Required fields: pairs (array of {left, right}). Client shuffles both sides.

### Production-tier (write or analyze code)
- **code-completion**: Code template with blanks to fill in. Required fields: codeTemplate (string with ___BLANK___ markers), blanks (string array of correct values), language. Each blank should test a specific concept.
- **bug-hunt**: Code with a bug on a specific line. Required fields: code, language, bugLine (1-based line number), bugExplanation. The bug must be subtle but unambiguous.
- **output-prediction**: Code whose output must be predicted. Required fields: code, language, expectedOutput. The code must have a single correct output.

### Synthesis-tier (reason about design and tradeoffs)
- **text**: Open-ended question answered in chat. Optional fields: code, language, hints. Good for "explain why" or "what would happen if" questions.
- **tradeoff-analysis**: Analyze design decisions and tradeoffs. Optional fields: code, language, hints. Must require considering multiple perspectives.

## Course Context
**Course:** "${courseTitle}"
**Description:** ${courseDescription}

## What Exercises Must Test
Every exercise must test the COURSE SUBJECT — "${courseTitle}".

You may use the learner's interests, profession, and life context to make exercises more engaging and relatable. But the skill being tested must always be the course subject, not something the learner already knows from another field.

The test: if the learner needs expertise OUTSIDE this course's subject to complete the exercise, the exercise is wrong. If the exercise merely references the learner's world while testing the course subject, that's good — it makes the exercise feel relevant.

If lesson content uses an analogy from another field (e.g., a code analogy in a language lesson, a music analogy in a math lesson), that analogy is for explanation only — do not build exercises around it.

## Difficulty Profile: ${difficulty}
${typeGuidance}

## Rules
- Generate ${exerciseCount} exercises.
- NEVER use the same exercise type more than twice.
- At least 1 recognition-tier exercise (quiz or flashcard).
${lessonNumber >= 3 ? "- At least 1 synthesis-tier exercise (text or tradeoff-analysis) since this is lesson 3+." : ""}
- Quiz distractors must be plausible misconceptions about the topic, not obviously wrong.
- Ordering items must have a single unambiguous correct sequence.
- All code must be syntactically valid in the specified language.
- Every prompt must be self-contained — the learner should be able to attempt the exercise with just the prompt and any provided code.
- Never use emojis.

${courseMemory ? `## Learner Insights\n<course-memory>\n${courseMemory}\n</course-memory>\nAdapt exercise difficulty and topics based on known strengths and gaps.\n` : ""}## Lesson Content (for context)
<lesson-content>
${lessonContent}
</lesson-content>

## Concepts to Test
${concepts.join(", ")}

Generate ${exerciseCount} exercises as a JSON array. Each exercise object must have: id (sequential from 1), type, title (short descriptive title), prompt, and the type-specific fields documented above.`;

  const user = `Generate exercises for Lesson ${lessonNumber}: "${lessonTitle}". Concepts: ${concepts.join(", ")}.`;

  return { system, user };
}
