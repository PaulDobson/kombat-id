"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 whitespace-nowrap",
        isActive
          ? "bg-primary-600 text-white shadow-sm"
          : "text-neutral-400 hover:text-neutral-100",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
