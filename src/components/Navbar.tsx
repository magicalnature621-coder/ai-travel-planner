import Link from "next/link";
import { getSession } from "@/lib/auth";
import Logo from "./Logo";
import { LogOut, Ticket } from "lucide-react";

export default async function Navbar() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Link href="/trips" className="btn-ghost !py-2">
                <Ticket className="h-4 w-4" /> <span className="hidden sm:inline">My Trips</span>
              </Link>
              <span className="hidden items-center gap-2 pl-2 text-sm text-slate-600 md:flex">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{session.name[0]?.toUpperCase()}</span>
                {session.name.split(" ")[0]}
              </span>
              <form action="/api/auth/logout" method="post">
                <button className="btn !px-2.5 text-slate-500 hover:bg-slate-100" title="Sign out" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn text-slate-700 hover:bg-slate-100">Sign in</Link>
              <Link href="/signup" className="btn-primary">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
