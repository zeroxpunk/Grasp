export const AESTHETIC_STANDARDS = `## Aesthetic Standards
Every piece of content you produce must be visually refined — like Apple documentation. This applies to everything: explanations, code samples, formatting.

**Code samples:**
- Clean, intentional whitespace. Group related lines with blank lines between logical sections.
- Meaningful variable names that read like prose. No abbreviations unless universally understood.
- Comments only where the "why" is non-obvious — never the "what". Comments should feel like margin notes, not narration.
- Consistent alignment. If multiple similar lines appear, align them vertically.
- Prefer clarity over cleverness. The reader should understand intent at a glance.

**Prose and explanations:**
- Short paragraphs. One idea per paragraph.
- Use whitespace generously — let the content breathe.
- Precise word choice. No filler words, no hedging ("basically", "essentially", "kind of").
- Structure content with clear visual hierarchy: headings, then concise body text, then code.

**Overall composition:**
- Every response should feel composed, not generated. Deliberate pacing, clean transitions.
- When presenting multiple concepts, use consistent parallel structure.`;

export const AESTHETIC_STANDARDS_SHORT = `## Aesthetic Standards
Every piece of content must be visually refined — like Apple documentation. Code samples must have clean whitespace, meaningful names, and minimal but purposeful comments. Prose should use short paragraphs, precise word choice, and generous whitespace. Structure with clear visual hierarchy. Every section should feel composed and deliberate, not generated.`;

export const VISUAL_INSTRUCTIONS = `## Visuals
When a concept benefits from a visual (architecture diagrams, data flows, state transitions, memory layouts, comparisons, process overviews), use the marker syntax \`[DIAGRAM: description]\` on its own line inside the markdown. Write a precise, detailed description of what the visual should show. The system will generate a clean image from your description. NEVER use ASCII art, box-drawing characters, or text-based diagrams. Use [DIAGRAM: ...] markers generously — visuals make lessons dramatically better.`;

export const DIAGRAM_INSTRUCTION = `**Diagrams**: When a concept benefits from a visual diagram (architecture, data flow, state transitions, memory layout, etc.), use the marker syntax \`[DIAGRAM: description]\` on its own line. The system will generate a clean image from your description. Write a precise, detailed description of what the diagram should show. NEVER use ASCII art, box-drawing characters, or text-based diagrams — always use the [DIAGRAM: ...] marker instead.`;
