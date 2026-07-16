import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function CopyButton({ text, label = "Copy", testId, className = "" }) {
  const [done, setDone] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setDone(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setDone(false), 1400);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <button
      onClick={onCopy}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-edge bg-white hover:bg-surfaceCream text-ink transition-colors duration-200 ${className}`}
    >
      {done ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
      <span className={done ? "text-teal copied-pulse" : ""}>{done ? "Copied!" : label}</span>
    </button>
  );
}
