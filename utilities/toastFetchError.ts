import { addToast } from "@heroui/react";

function toastError(title: string, description: string) {
  addToast({ title, description, color: "danger" });
}

// A 401 from the JwtAuthGuard means the request isn't authenticated: the Bearer
// token was missing, malformed, expired, or failed signature/audience/issuer
// validation (Auth0 RS256 via passport-jwt). The status alone can't tell us
// which, but the remedy is the same in every case — sign in again. This is
// distinct from a 403, where the user IS authenticated but lacks permission.
const NOT_AUTHENTICATED =
  "You're not signed in, or your session is no longer valid. Please sign in again.";

// Shared status-to-copy mapping for the save/delete/detach toasts:
// 401 -> session expired, 403 -> the action-specific forbidden message,
// anything else -> the action-specific generic message.
function describeStatus(res: Response, forbidden: string, generic: string) {
  if (res.status === 401) return NOT_AUTHENTICATED;
  if (res.status === 403) return forbidden;
  return generic;
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
    describeStatus(
      res,
      "You don't have permission to make this change.",
      "Something went wrong saving your changes."
    )
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
    describeStatus(
      res,
      "You don't have permission to delete this.",
      "Something went wrong deleting this item."
    )
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
    describeStatus(
      res,
      "You don't have permission to detach this collection.",
      "Something went wrong detaching this collection."
    )
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
  if (res.status === 401) {
    toastError("Unable to sync", NOT_AUTHENTICATED);
    return;
  }

  if (res.status === 403) {
    // A 403 here is either a plain role rejection (a guard returning `false`,
    // which NestJS reports as the default "Forbidden resource") or an explicit
    // ForbiddenException — e.g. OrganizationBggGuard's "BGG support is not
    // enabled for this organization." Prefer the explicit message; fall back to
    // the permission copy when the body carries only the generic default.
    const message = await readErrorMessage(res);
    toastError(
      "Unable to sync",
      message && message !== "Forbidden resource"
        ? message
        : "You don't have permission to sync this game."
    );
    return;
  }

  const message = await readErrorMessage(res);
  toastError(
    "Unable to sync",
    message ?? "Something went wrong syncing with BoardGameGeek."
  );
}
