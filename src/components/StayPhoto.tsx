"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";

// Shows a stay photo; if it can't load (offline, blocked), falls back to an illustration.
export default function StayPhoto({ src, hue, alt, className = "" }: { src?: string; hue: number; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 50) % 360} 65% 45%))` }}>
        <Building2 className="h-10 w-10 text-white/60" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}
