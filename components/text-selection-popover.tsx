"use client";

import { useState, useEffect, useCallback, type RefObject } from "react";

interface TextSelectionPopoverProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onAskAbout: (selectedText: string) => void;
}

export function TextSelectionPopover({
  containerRef,
  onAskAbout,
}: TextSelectionPopoverProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [selectedText, setSelectedText] = useState("");

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const anchorNode = selection.anchorNode;
    if (!anchorNode || !container.contains(anchorNode)) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    });
    setSelectedText(text);
  }, [containerRef]);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-selection-popover]")) {
        setPosition(null);
        setSelectedText("");
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [handleSelectionChange]);

  function handleClick() {
    if (!selectedText) return;

    onAskAbout(selectedText);
    setPosition(null);
    setSelectedText("");

    window.getSelection()?.removeAllRanges();
  }

  if (!position || !selectedText) return null;

  return (
    <div
      data-selection-popover
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
        zIndex: 50,
      }}
    >
      <button
        onClick={handleClick}
        className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs whitespace-nowrap hover:bg-zinc-700 hover:text-zinc-200 transition-colors border border-zinc-700"
      >
        Ask about this
      </button>
    </div>
  );
}

export type { TextSelectionPopoverProps };
