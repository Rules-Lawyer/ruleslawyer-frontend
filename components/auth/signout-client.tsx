"use client";

import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { VscSignOut } from "react-icons/vsc";

export function SignOut({ collapsed = false }: { collapsed?: boolean }) {
  const signOut = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/auth/logout`;
  };

  if (!collapsed) {
    return (
      <button
        onClick={signOut}
        aria-label="Sign Out"
        className="hover:text-gwgreen hover:cursor-pointer"
      >
        <span className="text-lg">
          <VscSignOut aria-hidden="true" className="inline-block" /> Sign Out
        </span>
      </button>
    );
  }

  return (
    <SimpleTooltip
      content="Sign Out"
      delay={1000}
      ariaLabel="Sign Out"
      triggerClassName="hover:text-gwgreen hover:cursor-pointer"
      onPress={signOut}
    >
      <span className="text-lg">
        <VscSignOut aria-hidden="true" className="inline-block" />
      </span>
    </SimpleTooltip>
  );
}
