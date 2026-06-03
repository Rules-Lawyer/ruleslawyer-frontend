import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendeeCard from "@/components/attendee/attendee-card";
import usePermissions from "@/utilities/swr/usePermissions";
import type { Attendee } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// The three modals have their own suites; stub them. Each is gated behind an
// `isOpen &&`, so a stubbed modal only appears once its disclosure opens.
jest.mock("@/components/attendee/attendee-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="edit-modal" />,
}));
jest.mock("@/components/attendee/atttendee-transfer-badge-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="transfer-modal" />,
}));
jest.mock("@/components/attendee/atttendee-lost-badge-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="lost-modal" />,
}));

const usePermissionsMock = usePermissions as jest.Mock;

function mockPermissions(opts: {
  superAdmin?: boolean;
  conAdmin?: { conventionId: number; admin: boolean }[];
  orgAdmin?: { organizationId: number; admin: boolean }[];
} = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: opts.orgAdmin ?? [] },
      conventions: { data: opts.conAdmin ?? [] },
    },
    isLoading: false,
    isError: {},
  });
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

function renderCard(over: Partial<Attendee> = {}) {
  const attendee = makeAttendee(over);
  return render(
    <AttendeeCard
      attendeeIn={attendee}
      attendeeId={attendee.id}
      pronounsIn={[]}
      conventionId={5}
      organizationId={7}
    />
  );
}

describe("AttendeeCard — readOnly access logic", () => {
  beforeEach(() => usePermissionsMock.mockReset());

  it("shows the edit/transfer/replace actions for a super admin", async () => {
    mockPermissions({ superAdmin: true });
    renderCard();
    expect(
      await screen.findByRole("button", { name: "Edit Ada Lovelace" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transfer Ada Lovelace" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Report Ada Lovelace's badge lost and replace" })
    ).toBeInTheDocument();
  });

  it("shows the actions for an admin of the attendee's convention", async () => {
    mockPermissions({ conAdmin: [{ conventionId: 5, admin: true }] });
    renderCard();
    expect(
      await screen.findByRole("button", { name: "Edit Ada Lovelace" })
    ).toBeInTheDocument();
  });

  it("shows the actions for an admin of the attendee's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    renderCard();
    expect(
      await screen.findByRole("button", { name: "Edit Ada Lovelace" })
    ).toBeInTheDocument();
  });

  it("hides every action from a read-only viewer", async () => {
    mockPermissions();
    renderCard();
    // The badge content still renders, just none of the action buttons.
    await screen.findByText("Ada Lovelace");
    expect(screen.queryByRole("button", { name: "Edit Ada Lovelace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Transfer Ada Lovelace" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Report Ada Lovelace's badge lost and replace" })
    ).not.toBeInTheDocument();
  });
});

describe("AttendeeCard — rendering & modal wiring", () => {
  it("renders the badge number, name, and email", async () => {
    mockPermissions();
    renderCard();
    expect(await screen.findByText("#101")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@test.dev")).toBeInTheDocument();
  });

  it("shows the pronouns when the attendee has them", async () => {
    mockPermissions();
    renderCard({ pronounsId: 3, pronouns: { id: 3, pronouns: "she/her" } });
    expect(await screen.findByText("she/her")).toBeInTheDocument();
  });

  it("opens the edit modal only after the edit action is clicked", async () => {
    mockPermissions({ superAdmin: true });
    renderCard();

    // Gated behind isOpen, so the stub is absent until the button is pressed.
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: "Edit Ada Lovelace" }));

    expect(await screen.findByTestId("edit-modal")).toBeInTheDocument();
  });

  it("opens the transfer modal when the transfer action is clicked", async () => {
    mockPermissions({ superAdmin: true });
    renderCard();

    expect(screen.queryByTestId("transfer-modal")).not.toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole("button", { name: "Transfer Ada Lovelace" })
    );

    expect(await screen.findByTestId("transfer-modal")).toBeInTheDocument();
  });

  it("opens the lost-badge modal when the report action is clicked", async () => {
    mockPermissions({ superAdmin: true });
    renderCard();

    expect(screen.queryByTestId("lost-modal")).not.toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Report Ada Lovelace's badge lost and replace",
      })
    );

    expect(await screen.findByTestId("lost-modal")).toBeInTheDocument();
  });
});
