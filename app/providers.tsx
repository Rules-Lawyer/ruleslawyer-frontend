"use client";
// HeroUI v3 removes HeroUIProvider. Client-side routing for HeroUI/react-aria
// components (anything using `href`) is now wired through react-aria's
// RouterProvider, and toasts render via the v3 <Toast /> region instead of v2's
// <ToastProvider />.
import { ToastProvider } from "@heroui/react";
import { RouterProvider } from "react-aria-components";
import { useRouter } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <RouterProvider navigate={router.push}>
      <ToastProvider />
      {children}
    </RouterProvider>
  );
}
