import Link from "next/link";
import { Plane } from "lucide-react";

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-md shadow-brand-500/30">
        <Plane className="h-5 w-5 -rotate-45" />
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
        AI Travel <span className={light ? "text-brand-200" : "text-brand-600"}>Planner</span>
      </span>
    </Link>
  );
}
