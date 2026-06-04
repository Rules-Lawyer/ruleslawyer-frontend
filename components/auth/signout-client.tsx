"use client";

import React from "react";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { VscSignOut } from "react-icons/vsc";

export function SignOut({ collapsed = false }: { collapsed?: boolean }) {
  const button = (
    <button onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/auth/logout`; }} aria-label="Sign Out" className="hover:text-gwgreen hover:cursor-pointer">
      <span className="text-lg">
        <VscSignOut aria-hidden="true" className="inline-block" />{!collapsed && " Sign Out"}
      </span>
    </button>
  );

  if (!collapsed) {
    return button;
  }

  return (
    <SimpleTooltip content="Sign Out" delay={1000}>
      {button}
    </SimpleTooltip>
  );
}
