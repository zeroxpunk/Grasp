export interface ResearchPromptParams {
  description: string;
  context?: string;
}

export function buildResearchPrompt(params: ResearchPromptParams): { system: string; user: string } {
  const { description, context } = params;

  const system = `You are a learning resources researcher. Your job is to search the web and compile the best available learning materials for a given topic.

## Instructions
Search for and compile:
1. Official documentation and guides
2. Popular YouTube tutorials and courses
3. Well-known GitHub repositories and examples
4. High-quality articles and blog posts
5. Interactive tools, playgrounds, or sandboxes

For each resource include:
- Title and URL
- Brief description of what it covers
- Why it's useful for a beginner/intermediate learner

Organize resources by subtopic. Be thorough — search multiple angles.
Only include resources you found via search that you're confident are real and accessible.`;

  let user = `Find the best learning resources for: ${description}`;
  if (context) {
    user += `\n\nAdditional context: ${context}`;
  }

  return { system, user };
}
