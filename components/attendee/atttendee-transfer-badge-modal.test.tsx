import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDisclosure } from "@/utilities/useDisclosure";
import AttendeeTransferBadgeModal from "@/components/attendee/atttendee-transfer-badge-modal";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import type { Attendee } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
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

describe("AttendeeTransferBadgeModal", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("titles the modal with the source attendee's badge name", async () => {
    render(
      <AttendeeTransferBadgeModal
        attendeeIn={makeAttendee()}
        disclosure={openDisclosure().disclosure}
        conventionId={5}
        pronounsIn={[]}
      />
    );
    expect(await screen.findByText("Badge Transfer - Ada Lovelace")).toBeInTheDocument();
  });

  it("PUTs the new identity and source badge number to /con/:id/transferBadge", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { disclosure, onClose } = openDisclosure();

    render(
      <AttendeeTransferBadgeModal
        attendeeIn={makeAttendee({ badgeNumber: "101" })}
        disclosure={disclosure}
        conventionId={5}
        pronounsIn={[]}
      />
    );

    await userEvent.type(await screen.findByLabelText("Badge Name"), "Grace Hopper");
    await userEvent.click(screen.getByRole("button", { name: "Transfer Badge" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/con/5/transferBadge",
      {
        fromBadgeNumber: "101",
        newBadgeName: "Grace Hopper",
        newBadgeFirstName: "",
        newBadgeLastName: "",
        newBadgeLegalName: "",
        newBadgePronounsId: null,
        newBadgeEmail: null,
      },
      "tok"
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("does not close when the server rejects the transfer", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const { disclosure, onClose } = openDisclosure();

    render(
      <AttendeeTransferBadgeModal
        attendeeIn={makeAttendee()}
        disclosure={disclosure}
        conventionId={5}
        pronounsIn={[]}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Transfer Badge" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close when the transfer fails at the network level", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const { disclosure, onClose } = openDisclosure();

    render(
      <AttendeeTransferBadgeModal
        attendeeIn={makeAttendee()}
        disclosure={disclosure}
        conventionId={5}
        pronounsIn={[]}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Transfer Badge" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the transfer action to an org admin who is not a convention admin", async () => {
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
      <AttendeeTransferBadgeModal
        attendeeIn={makeAttendee()}
        disclosure={openDisclosure().disclosure}
        conventionId={5}
        organizationId={7}
        pronounsIn={[]}
      />
    );
    expect(await screen.findByRole("button", { name: "Transfer Badge" })).toBeInTheDocument();
  });

  it("hides the transfer action from a read-only viewer", async () => {
    mockPermissions({ superAdmin: false });
    render(
      <AttendeeTransferBadgeModal
        attendeeIn={makeAttendee()}
        disclosure={openDisclosure().disclosure}
        conventionId={5}
        pronounsIn={[]}
      />
    );
    await screen.findByText("Badge Transfer - Ada Lovelace");
    expect(screen.queryByRole("button", { name: "Transfer Badge" })).not.toBeInTheDocument();
  });
});
