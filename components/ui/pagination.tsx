"use client";
import React from "react";
import { Button } from "@heroui/react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Plural noun shown in the count, e.g. "attendees" or "games". */
  noun: string;
  onPageChange: (page: number) => void;
}

export default function Pagination(props: PaginationProps) {
  const { page, totalPages, total, noun, onPageChange } = props;

  if (totalPages <= 1) {
    return null;
  }

  const goToPage = (next: number) => {
    onPageChange(next);
    // Drop focus off the button so react-aria/the browser doesn't scroll it
    // back into view, and defer past the re-render so the scroll sticks.
    (document.activeElement as HTMLElement | null)?.blur();
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  };

  return (
    <div className="flex items-center justify-center gap-4 my-6">
      <Button
        isDisabled={page <= 1}
        onPress={() => goToPage(Math.max(1, page - 1))}
      >
        Previous
      </Button>
      <p className="text-center">
        Page {page} of {totalPages}<br/>({total} {noun})
      </p>
      <Button
        isDisabled={page >= totalPages}
        onPress={() => goToPage(Math.min(totalPages, page + 1))}
      >
        Next
      </Button>
    </div>
  );
}
