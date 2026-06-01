import { addToast } from "@heroui/react";

function toastError(title: string, description: string) {
  addToast({ title, description, color: "danger" });
}

/**
 * Pull a human-readable reason out of a failed response body. NestJS error
 * responses carry `{ message: string | string[] }`; returns null when the body
 * is empty or not parseable so callers can fall back to generic copy.
 */
async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    const body = JSON.parse(text);
    if (typeof body?.message === "string") return body.message;
    if (Array.isArray(body?.message)) return body.message.join(" ");
    return null;
  } catch {
    return null;
  }
}

/**
 * Surface a failed save (a completed request that came back with a non-2xx
 * status) to the user via a toast. Call this from the `.then` that inspects the
 * response, before parsing the body.
 */
export function toastSaveError(res: Response) {
  toastError(
    "Unable to save",
    res.status === 403
      ? "You don't have permission to make this change."
      : "Something went wrong saving your changes."
  );
}

/**
 * Surface a transport-level failure (the request never reached the server, or
 * the connection dropped) during a save via a toast. Call this from the
 * `.catch` of a mutating fetch.
 */
export function toastNetworkError() {
  toastError("Unable to save", "Could not reach the server. Please try again.");
}

/**
 * Surface a failed delete (a completed request that came back with a non-2xx
 * status) to the user via a toast. Call this from the `.then` that inspects the
 * response.
 */
export function toastDeleteError(res: Response) {
  toastError(
    "Unable to delete",
    res.status === 403
      ? "You don't have permission to delete this."
      : "Something went wrong deleting this item."
  );
}

/**
 * Surface a transport-level failure during a delete via a toast. Call this from
 * the `.catch` of a delete fetch.
 */
export function toastDeleteNetworkError() {
  toastError(
    "Unable to delete",
    "Could not reach the server. Please try again."
  );
}

/**
 * Surface a failed detach (a completed request that came back with a non-2xx
 * status) to the user via a toast. Call this from the `.then` that inspects the
 * response.
 */
export function toastDetachError(res: Response) {
  toastError(
    "Unable to detach",
    res.status === 403
      ? "You don't have permission to detach this collection."
      : "Something went wrong detaching this collection."
  );
}

/**
 * Surface a transport-level failure during a detach via a toast. Call this from
 * the `.catch` of a detach fetch.
 */
export function toastDetachNetworkError() {
  toastError(
    "Unable to detach",
    "Could not reach the server. Please try again."
  );
}

/**
 * Surface a failed "Sync with BoardGameGeek" to the user, preferring the
 * server-provided reason (e.g. the game has no BoardGameGeek ID) when present.
 */
export async function toastSyncError(res: Response) {
  if (res.status === 403) {
    toastError("Unable to sync", "You don't have permission to sync this game.");
    return;
  }

  const message = await readErrorMessage(res);
  toastError(
    "Unable to sync",
    message ?? "Something went wrong syncing with BoardGameGeek."
  );
}
