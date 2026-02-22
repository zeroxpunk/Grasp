import { createHighlighter, type Highlighter } from "shiki";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString as hastToString } from "hast-util-to-string";
import type { Root, Element, ElementContent } from "hast";

let hl: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!hl) {
    hl = await createHighlighter({
      themes: ["github-dark"],
      langs: [
        "rust",
        "typescript",
        "javascript",
        "kotlin",
        "json",
        "toml",
        "bash",
        "shell",
        "yaml",
        "tsx",
        "jsx",
        "css",
        "html",
        "markdown",
        "text",
      ],
    });
  }
  return hl;
}

const LANG_LABELS: Record<string, string> = {
  rust: "rust",
  typescript: "typescript",
  javascript: "javascript",
  kotlin: "kotlin",
  json: "json",
  toml: "toml",
  bash: "bash",
  shell: "shell",
  yaml: "yaml",
  tsx: "tsx",
  jsx: "jsx",
  css: "css",
  html: "html",
  markdown: "markdown",
  text: "text",
  rs: "rust",
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  yml: "yaml",
};

function slugify(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}

function wrapCodeBlock(highlightedHtml: string, lang: string): string {
  const label = LANG_LABELS[lang] || lang || "code";
  const copyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const sparklesIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/></svg>`;

  const copyHandler = `(function(btn){var code=btn.closest('.code-block').querySelector('code');navigator.clipboard.writeText(code.textContent||'');btn.querySelector('.copy-label').textContent='Copied!';btn.querySelector('.icon-copy').style.display='none';btn.querySelector('.icon-check').style.display='inline';setTimeout(function(){btn.querySelector('.copy-label').textContent='Copy';btn.querySelector('.icon-copy').style.display='inline';btn.querySelector('.icon-check').style.display='none'},2000)})(this)`;

  const explainHandler = `(function(btn){var code=btn.closest('.code-block').querySelector('code').textContent||'';var q='Explain this code block to me:\\n\\n\`\`\`${lang}\\n'+code+'\\n\`\`\`';if(window.__chatPanelSendMessage){window.__chatPanelSendMessage(q)}else if(window.__chatPanelExplainCode){window.__chatPanelExplainCode(q)}})(this)`;

  return `<div class="code-block"><div class="code-block-header"><span class="code-block-lang">${esc(label)}</span><div class="code-block-actions"><button class="code-block-explain" onclick="${explainHandler}"><span>${sparklesIcon}</span><span>Explain</span></button><button class="code-block-copy" onclick="${copyHandler}"><span class="icon-copy">${copyIcon}</span><span class="icon-check" style="display:none">${checkIcon}</span><span class="copy-label">Copy</span></button></div></div><div class="code-block-body">${highlightedHtml}</div></div>`;
}

/**
 * Renders a single code snippet with shiki highlighting.
 * Used for exercise code blocks on the server.
 */
export async function renderCodeBlock(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  const loadedLangs = highlighter.getLoadedLanguages();

  if (lang && loadedLangs.includes(lang)) {
    return highlighter.codeToHtml(code, { lang, theme: "github-dark" });
  }
  return `<pre class="shiki"><code>${esc(code)}</code></pre>`;
}

/**
 * Rehype plugin: replaces <pre><code> with Shiki-highlighted code blocks.
 */
function rehypeCodeBlocks(highlighter: Highlighter) {
  const loadedLangs = highlighter.getLoadedLanguages();

  return () => (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (
        node.tagName !== "pre" ||
        index === undefined ||
        !parent ||
        !("children" in parent)
      )
        return;

      const codeChild = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code"
      );
      if (!codeChild) return;

      const classNames = (codeChild.properties?.className as string[]) || [];
      const langClass = classNames.find((c) => c.startsWith("language-"));
      const lang = langClass ? langClass.replace("language-", "") : "";

      const code = hastToString(codeChild);

      let html: string;
      if (lang && loadedLangs.includes(lang)) {
        html = highlighter.codeToHtml(code, { lang, theme: "github-dark" });
      } else {
        html = `<pre class="shiki"><code>${esc(code)}</code></pre>`;
      }

      (parent.children as Array<ElementContent | { type: "raw"; value: string }>)[index!] = {
        type: "raw",
        value: wrapCodeBlock(html, lang),
      };
    });
  };
}

/**
 * Rehype plugin: assigns custom CSS classes and transforms images into figures.
 */
function rehypeCustomClasses() {
  return (tree: Root) => {
    // Pass 1 — class assignment
    visit(tree, "element", (node, _index, parent) => {
      const props = node.properties || (node.properties = {});
      const cls = (s: string) => {
        const existing = props.className;
        if (existing && Array.isArray(existing)) {
          (existing as (string | number)[]).push(s);
        } else if (existing) {
          props.className = [existing as string | number, s];
        } else {
          props.className = [s];
        }
      };

      switch (node.tagName) {
        case "h1": {
          cls("md-h1");
          const text = hastToString(node);
          props.id = slugify(text);
          break;
        }
        case "h2":
          cls("md-h2");
          props.id = slugify(hastToString(node));
          break;
        case "h3":
          cls("md-h3");
          props.id = slugify(hastToString(node));
          break;
        case "h4":
          cls("md-h4");
          props.id = slugify(hastToString(node));
          break;
        case "p":
          cls("md-p");
          break;
        case "a": {
          cls("md-link");
          const href = props.href as string | undefined;
          if (href && /^https?:\/\//.test(href)) {
            props.target = "_blank";
            props.rel = "noopener noreferrer";
          }
          break;
        }
        case "strong":
          cls("md-bold");
          break;
        case "code": {
          const parentEl = parent as Element | undefined;
          if (!parentEl || parentEl.tagName !== "pre") {
            cls("inline-code");
          }
          break;
        }
        case "blockquote":
          cls("md-quote");
          break;
        case "hr":
          cls("md-hr");
          break;
        case "ul":
          cls("md-ul");
          break;
        case "ol":
          cls("md-ol");
          break;
        case "li":
          cls("md-li");
          break;
        case "table":
          cls("md-table");
          break;
        case "thead":
          cls("md-thead");
          break;
        case "th":
          cls("md-th");
          break;
        case "tr":
          cls("md-tr");
          break;
        case "td":
          cls("md-td");
          break;
      }
    });

    // Pass 2 — image→figure wrapping
    visit(tree, "element", (node) => {
      if (node.tagName !== "p") return;

      const elementChildren = node.children.filter(
        (c) => !(c.type === "text" && !c.value.trim())
      );
      if (
        elementChildren.length !== 1 ||
        elementChildren[0].type !== "element" ||
        elementChildren[0].tagName !== "img"
      )
        return;

      const img = elementChildren[0] as Element;
      const alt = (img.properties?.alt as string) || "";

      // Mutate <p> into <figure>
      node.tagName = "figure";
      node.properties = { className: ["md-figure"] };
      img.properties = {
        ...(img.properties || {}),
        className: ["md-img"],
      };
      node.children = [
        img,
        {
          type: "element",
          tagName: "figcaption",
          properties: { className: ["md-figcaption"] },
          children: [{ type: "text", value: alt }],
        },
      ];
    });
  };
}

/**
 * Renders markdown to HTML with shiki syntax highlighting for code blocks.
 * Runs server-side only.
 */
export async function renderMarkdown(md: string): Promise<string> {
  const highlighter = await getHighlighter();

  // Strip content before first H1 and remove the H1 itself
  let cleaned = md;
  const firstHeading = cleaned.search(/^# /m);
  if (firstHeading > 0) {
    cleaned = cleaned.slice(firstHeading);
  }
  cleaned = cleaned.replace(/^# .+\n?/, "");

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeCodeBlocks(highlighter))
    .use(rehypeCustomClasses)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(cleaned);

  return String(result);
}
