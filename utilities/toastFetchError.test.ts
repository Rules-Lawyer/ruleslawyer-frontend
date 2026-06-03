import { addToast } from "@heroui/react";
import {
  toastSaveError,
  toastNetworkError,
  toastDeleteError,
  toastDeleteNetworkError,
  toastDetachError,
  toastDetachNetworkError,
  toastSyncError,
} from "@/utilities/toastFetchError";

jest.mock("@heroui/react", () => ({ addToast: jest.fn() }));

const addToastMock = addToast as jest.Mock;

// Each helper forwards a danger-colored toast to heroui; assert the copy and
// that the 403 branch differs from the generic branch.
const lastToast = () => addToastMock.mock.calls.at(-1)?.[0];

function res(status: number, body?: string): Response {
  return {
    status,
    text: async () => body ?? "",
  } as unknown as Response;
}

beforeEach(() => addToastMock.mockReset());

const NOT_AUTHENTICATED =
  "You're not signed in, or your session is no longer valid. Please sign in again.";

describe("toastSaveError", () => {
  it("uses a not-authenticated message for 401", () => {
    toastSaveError(res(401));
    expect(lastToast()).toEqual({
      title: "Unable to save",
      description: NOT_AUTHENTICATED,
      color: "danger",
    });
  });

  it("uses a permission message for 403", () => {
    toastSaveError(res(403));
    expect(lastToast()).toEqual({
      title: "Unable to save",
      description: "You don't have permission to make this change.",
      color: "danger",
    });
  });

  it("uses a generic message for other statuses", () => {
    toastSaveError(res(500));
    expect(lastToast().description).toBe("Something went wrong saving your changes.");
  });
});

describe("toastDeleteError", () => {
  it("uses a not-authenticated message for 401", () => {
    toastDeleteError(res(401));
    expect(lastToast()).toMatchObject({ title: "Unable to delete", description: NOT_AUTHENTICATED });
  });

  it("uses a permission message for 403", () => {
    toastDeleteError(res(403));
    expect(lastToast()).toMatchObject({
      title: "Unable to delete",
      description: "You don't have permission to delete this.",
    });
  });

  it("uses a generic message for other statuses", () => {
    toastDeleteError(res(404));
    expect(lastToast().description).toBe("Something went wrong deleting this item.");
  });
});

describe("toastDetachError", () => {
  it("uses a not-authenticated message for 401", () => {
    toastDetachError(res(401));
    expect(lastToast()).toMatchObject({ title: "Unable to detach", description: NOT_AUTHENTICATED });
  });

  it("uses a permission message for 403", () => {
    toastDetachError(res(403));
    expect(lastToast().description).toBe("You don't have permission to detach this collection.");
  });

  it("uses a generic message for other statuses", () => {
    toastDetachError(res(500));
    expect(lastToast().description).toBe("Something went wrong detaching this collection.");
  });
});

describe("network-error helpers", () => {
  it("toastNetworkError surfaces a save retry message", () => {
    toastNetworkError();
    expect(lastToast()).toMatchObject({
      title: "Unable to save",
      description: "Could not reach the server. Please try again.",
    });
  });

  it("toastDeleteNetworkError surfaces a delete retry message", () => {
    toastDeleteNetworkError();
    expect(lastToast()).toMatchObject({ title: "Unable to delete" });
  });

  it("toastDetachNetworkError surfaces a detach retry message", () => {
    toastDetachNetworkError();
    expect(lastToast()).toMatchObject({ title: "Unable to detach" });
  });
});

describe("toastSyncError", () => {
  it("uses a not-authenticated message for 401 without reading the body", async () => {
    await toastSyncError(res(401));
    expect(lastToast()).toMatchObject({ title: "Unable to sync", description: NOT_AUTHENTICATED });
  });

  it("uses the permission message for a 403 with an empty body", async () => {
    await toastSyncError(res(403));
    expect(lastToast().description).toBe("You don't have permission to sync this game.");
  });

  it("uses the permission message for a 403 with Nest's generic message", async () => {
    await toastSyncError(res(403, JSON.stringify({ message: "Forbidden resource" })));
    expect(lastToast().description).toBe("You don't have permission to sync this game.");
  });

  it("prefers an explicit ForbiddenException message on a 403", async () => {
    await toastSyncError(
      res(403, JSON.stringify({ message: "BGG support is not enabled for this organization." }))
    );
    expect(lastToast().description).toBe("BGG support is not enabled for this organization.");
  });

  it("prefers a string message from the response body", async () => {
    await toastSyncError(res(400, JSON.stringify({ message: "Game has no BoardGameGeek ID." })));
    expect(lastToast().description).toBe("Game has no BoardGameGeek ID.");
  });

  it("joins an array message from the response body", async () => {
    await toastSyncError(res(400, JSON.stringify({ message: ["bad", "input"] })));
    expect(lastToast().description).toBe("bad input");
  });

  it("falls back to generic copy when the body is empty", async () => {
    await toastSyncError(res(500, ""));
    expect(lastToast().description).toBe("Something went wrong syncing with BoardGameGeek.");
  });

  it("falls back to generic copy when the body is not valid JSON", async () => {
    await toastSyncError(res(500, "<html>nope</html>"));
    expect(lastToast().description).toBe("Something went wrong syncing with BoardGameGeek.");
  });

  it("falls back to generic copy when the body has no message field", async () => {
    await toastSyncError(res(500, JSON.stringify({ error: "x" })));
    expect(lastToast().description).toBe("Something went wrong syncing with BoardGameGeek.");
  });
});
