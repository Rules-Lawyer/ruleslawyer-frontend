import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDisclosure } from "@/utilities/useDisclosure";
import AttendeeModal from "@/components/attendee/attendee-modal";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import type { Attendee } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// Keep real heroui components, but stub addToast so no ToastProvider is needed.
jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
}));

const fetchMock = frontendFetch as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;

function mockPermissions(opts: { superAdmin?: boolean } = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: [] },
      conventions: { data: [] },
    },
    isLoading: false,
    isError: {},
  });
}

function openDisclosure() {
  const onClose = jest.fn();
  const disclosure = { isOpen: true, onOpen: jest.fn(), onClose } as unknown as ReturnType<
    typeof useDisclosure
  >;
  return { disclosure, onClose };
}

function makeAttendee(over: Partial<Attendee> = {}): Attendee {
  return {
    id: 1,
    conventionId: 5,
    badgeName: "Ada Lovelace",
    badgeFirstName: "Ada",
    badgeLastName: "Lovelace",
    legalName: "Augusta Ada King",
    userId: null,
    badgeNumber: "101",
    barcode: "*101*",
    badgeTypeId: null,
    tteBadgeNumber: null,
    tteBadgeId: null,
    email: "ada@test.dev",
    pronounsId: null,
    pronouns: null,
    checkedIn: false,
    printed: false,
    registrationCode: null,
    merch: null,
    eligibleForPrizes: true,
    lostBadge: false,
    ...over,
  } as Attendee;
}

describe("AttendeeModal", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("titles the modal with the attendee's badge name and populates the fields", async () => {
    render(
      <AttendeeModal attendeeIn={makeAttendee()} disclosure={openDisclosure().disclosure} />
    );
    expect(await screen.findByText("User Editor - Ada Lovelace")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Augusta Ada King")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ada@test.dev")).toBeInTheDocument();
  });

  it("shows 'New User' when there is no attendee to edit", async () => {
    render(
      <AttendeeModal conventionId={5} disclosure={openDisclosure().disclosure} />
    );
    expect(await screen.findByText("User Editor - New User")).toBeInTheDocument();
  });

  it("PUTs the edited attendee fields to /attendee/:id on save", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { disclosure, onClose } = openDisclosure();
    const onSaved = jest.fn();

    render(
      <AttendeeModal
        attendeeIn={makeAttendee({ id: 55 })}
        disclosure={disclosure}
        onSaved={onSaved}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/attendee/55",
      {
        badgeName: "Ada Lovelace",
        badgeFirstName: "Ada",
        badgeLastName: "Lovelace",
        legalName: "Augusta Ada King",
        badgeNumber: "101",
        barcode: "*101*",
        pronounsId: null,
        email: "ada@test.dev",
      },
      "tok"
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onSaved or close when the server rejects the save", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const { disclosure, onClose } = openDisclosure();
    const onSaved = jest.fn();

    render(
      <AttendeeModal attendeeIn={makeAttendee({ id: 55 })} disclosure={disclosure} onSaved={onSaved} />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("hides Save from a read-only viewer", async () => {
    mockPermissions({ superAdmin: false });
    render(
      <AttendeeModal attendeeIn={makeAttendee()} disclosure={openDisclosure().disclosure} />
    );
    await screen.findByText("User Editor - Ada Lovelace");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("shows Save to an admin of the attendee's convention", async () => {
    usePermissionsMock.mockReturnValue({
      permissions: {
        user: { data: { superAdmin: false } },
        organizations: { data: [] },
        conventions: { data: [{ conventionId: 5, admin: true }] },
      },
      isLoading: false,
      isError: {},
    });
    render(
      <AttendeeModal
        attendeeIn={makeAttendee()}
        conventionId={5}
        disclosure={openDisclosure().disclosure}
      />
    );
    expect(await screen.findByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shows Save to an org admin who is not a convention admin", async () => {
    usePermissionsMock.mockReturnValue({
      permissions: {
        user: { data: { superAdmin: false } },
        organizations: { data: [{ organizationId: 7, admin: true }] },
        conventions: { data: [] },
      },
      isLoading: false,
      isError: {},
    });
    render(
      <AttendeeModal
        attendeeIn={makeAttendee()}
        conventionId={5}
        organizationId={7}
        disclosure={openDisclosure().disclosure}
      />
    );
    expect(await screen.findByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("does not close when the save request fails at the network level", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const { disclosure, onClose } = openDisclosure();
    const onSaved = jest.fn();

    render(
      <AttendeeModal attendeeIn={makeAttendee({ id: 55 })} disclosure={disclosure} onSaved={onSaved} />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
