"use client";

import { useState, useEffect } from "react";
import { useGraspClient } from "@/lib/grasp-client-provider";

interface DiagramImageProps {
  description: string;
}

export function DiagramImage({ description }: DiagramImageProps) {
  const client = useGraspClient();
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        const data = await client.images.generate({ description });

        if (!cancelled) {
          setDataUrl(data.dataUrl);
          setState("done");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [description]);

  if (state === "loading") {
    return (
      <div className="my-3 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="h-48 bg-zinc-900/40 flex items-center justify-center">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 border border-zinc-700 rounded-full"
              style={{ animation: "spin 1.2s linear infinite" }}
            />
            <span className="text-[11px] text-zinc-600">Generating diagram</span>
          </div>
        </div>
        <div className="px-3 py-2 border-t border-zinc-800/60">
          <p className="text-[11px] text-zinc-700 truncate">{description}</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="my-3 border border-zinc-800 rounded-lg p-3">
        <p className="text-[11px] text-zinc-600">
          Could not generate diagram: {description}
        </p>
      </div>
    );
  }

  return (
    <div className="my-3 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl!}
          alt={description}
          className="w-full h-auto rounded"
        />
      </div>
    </div>
  );
}
