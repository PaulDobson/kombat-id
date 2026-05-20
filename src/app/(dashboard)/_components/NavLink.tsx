"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}

export function NavLink({ href, children, exact }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 whitespace-nowrap",
        isActive
          ? "bg-primary-600/90 text-white shadow-sm shadow-primary-900/40"
          : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
