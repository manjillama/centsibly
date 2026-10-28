"use client";
import { ReactNode, useEffect, useRef, useState } from "react";

// Mount once near the viewport, then keep the chart alive while scrolling.
export default function DeferredChart({ children, height = 320 }: { children: ReactNode; height?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "250px" });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={container} style={{ minHeight: height }}>
    {visible ? children : <div className="flex items-center justify-center text-xs text-neutral-500" style={{ height }} role="status">Chart loads as you scroll</div>}
  </div>;
}
