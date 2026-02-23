"use client";

import { useEffect, useState, useCallback } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({
  contentRef,
  scrollContainerRef,
}: {
  contentRef: React.RefObject<HTMLElement | null>;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Extract headings from content
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const headings = el.querySelectorAll<HTMLElement>("h2");
    const tocItems: TocItem[] = [];

    headings.forEach((h) => {
      if (!h.id) return;
      tocItems.push({
        id: h.id,
        text: h.textContent || "",
        level: 2,
      });
    });

    setItems(tocItems);
    if (tocItems.length > 0) setActiveId(tocItems[0].id);
  }, [contentRef]);

  // Track active heading on scroll
  const updateActive = useCallback(() => {
    if (items.length === 0) return;

    let current = items[0].id;
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 100) {
          current = item.id;
        }
      }
    }
    setActiveId(current);
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;

    const el = scrollContainerRef?.current;
    if (el) {
      el.addEventListener("scroll", updateActive, { passive: true });
      updateActive();
      return () => el.removeEventListener("scroll", updateActive);
    } else {
      window.addEventListener("scroll", updateActive, { passive: true });
      updateActive();
      return () => window.removeEventListener("scroll", updateActive);
    }
  }, [items, scrollContainerRef, updateActive]);

  if (items.length === 0) return null;

  return (
    <nav className="toc-nav">
      <ul className="toc-list">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById(item.id);
                if (target) {
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                  setActiveId(item.id);
                }
              }}
              className={[
                "toc-link",
                item.level === 3 ? "toc-link-sub" : "",
                activeId === item.id ? "toc-link-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
