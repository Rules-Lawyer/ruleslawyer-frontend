// Domain types for data returned by the ruleslawyer-backend API.
//
// These mirror the backend response entities one-to-one
// (ruleslawyer-backend/src/common/entities/*.entity.ts), adjusted for their
// JSON-serialized form on the wire:
//   - Prisma `DateTime`  -> string (ISO)
//   - Prisma `Decimal`   -> string | number
//   - Prisma `Bytes`     -> CoverArtData (org/convention logos, inlined as JSON)
// Relation/`_count` variants match the same optionality the entities declare,
// except where a specific endpoint always includes a relation (noted inline).
//
// Game cover art and per-copy cover-art overrides are NOT inlined: the backend
// omits those blobs from all JSON responses and streams them from dedicated
// public routes instead (GET /api/game/:id/cover, GET /api/copy/:id/cover), so
// they have no field here.

/** Prisma `Bytes` as serialized over JSON (org/convention logos). */
export type CoverArtData =
  | string
  | { type: "Buffer"; data: number[] }
  | Record<string, number>;

// ---------------------------------------------------------------------------
// Scalar entities (mirror *.entity.ts `implements <PrismaModel>`)
// ---------------------------------------------------------------------------

/** UserEntity */
export interface User {
  id: number;
  email: string;
  name: string | null;
  username: string | null;
  superAdmin: boolean;
  pronounsId: number | null;
}

/** OrganizationEntity */
export interface Organization {
  id: number;
  name: string;
  ownerId: number;
}

/** CollectionEntity */
export interface Collection {
  id: number;
  name: string;
  organizationId: number;
  public: boolean;
  allowWinning: boolean;
  archived: boolean;
}

/** GameEntity (weight: Decimal, bggRating: Decimal; cover art served separately). */
export interface Game {
  id: number;
  organizationId: number;
  bggId: number | null;
  bggRank: number | null;
  bggRating: string | number | null;
  lastBGGSync: string | null;
  name: string;
  shortDescription: string | null;
  designer: string | null;
  artist: string | null;
  publisher: string | null;
  longDescription: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minTime: number | null;
  maxTime: number | null;
  minAge: number | null;
  weight: string | number | null;
  yearPublished: number | null;
}

/** CopyEntity (cover-art override served separately, see header note). */
export interface Copy {
  id: number;
  gameId: number;
  dateAdded: string;
  barcodeLabel: string;
  barcode: string;
  dateRetired: string | null;
  comments: string | null;
  winnable: boolean;
  winnerId: number | null;
  collectionId: number;
  organizationId: number;
}

/** CheckOutEntity */
export interface CheckOut {
  id: number;
  attendeeId: number;
  checkOut: string;
  checkIn: string | null;
  copyId: number | null;
  submitted: boolean;
}

/** AttendeeEntity */
export interface Attendee {
  id: number;
  conventionId: number;
  badgeName: string;
  badgeFirstName: string;
  badgeLastName: string;
  legalName: string;
  userId: number | null;
  badgeNumber: string;
  barcode: string;
  badgeTypeId: number | null;
  tteBadgeNumber: number | null;
  tteBadgeId: string | null;
  email: string | null;
  pronounsId: number | null;
  checkedIn: boolean;
  printed: boolean;
  registrationCode: string | null;
  merch: string | null;
  eligibleForPrizes: boolean;
  lostBadge: boolean;
}

/** ConventionEntity (logo/logoSquare: Bytes). */
export interface Convention {
  id: number;
  organizationId: number;
  name: string;
  theme: string;
  logo: CoverArtData;
  logoSquare: CoverArtData;
  icon: string;
  startDate: string;
  endDate: string;
  registrationUrl: string | null;
  typeId: number;
  annual: string;
  size: number | null;
  cancelled: boolean;
  tteConventionId: string | null;
}

/** ConventionTypeEntity (logo/logoSquare: Bytes). */
export interface ConventionType {
  id: number;
  name: string;
  description: string | null;
  logo: CoverArtData | null;
  logoSquare: CoverArtData | null;
  icon: string | null;
  content: string | null;
  organizationId: number;
}

/** ConventionCollectionsEntity */
export interface ConventionCollections {
  id: number;
  conventionId: number;
  collectionId: number;
}

/** UserOrganizationPermissionsEntity */
export interface UserOrganizationPermissions {
  id: number;
  userId: number;
  organizationId: number;
  admin: boolean;
  geekGuide: boolean;
  readOnly: boolean;
}

/** UserConventionPermissionsEntity */
export interface UserConventionPermissions {
  id: number;
  userId: number;
  conventionId: number;
  admin: boolean;
  geekGuide: boolean;
  attendee: boolean;
}

// ---------------------------------------------------------------------------
// Relation-included entities (mirror *-with-relations / *-with-* entities)
// ---------------------------------------------------------------------------

/** CollectionCountEntity */
export interface CollectionCount {
  copies: number;
  conventions: number;
}

/** CollectionWithRelationsEntity — all relations optional (includes vary). */
export interface CollectionWithRelations extends Collection {
  _count?: CollectionCount;
  organization?: Organization;
  conventions?: ConventionCollections[];
}

/**
 * Specialization of CollectionWithRelations for the card/grid reads
 * (collectionsByOrg, convention()), which always include `_count`.
 */
export interface CollectionWithCount extends Collection {
  _count: CollectionCount;
  conventions?: ConventionCollections[];
}

/** CheckOutWithAttendeeEntity */
export interface CheckOutWithAttendee extends CheckOut {
  attendee?: Attendee;
}

/** CopyWithRelationsEntity — relations optional (includes vary by route). */
export interface CopyWithRelations extends Copy {
  checkOuts?: CheckOutWithAttendee[];
  game?: Game;
  collection?: CollectionWithRelations;
}

/**
 * A copy nested under `game.copies` for the game-with-copies routes, which
 * always include `checkOuts` (no attendee) and `game`.
 */
export interface GameCopy extends Copy {
  checkOuts: CheckOut[];
  game: Game;
  collection?: Collection;
}

/** GameWithCopiesEntity */
export interface GameWithCopies extends Game {
  copies: GameCopy[];
  _count?: { copies: number };
}

/** copy() route: copy with its collection + game (CopyWithRelations subset). */
export interface CopyDetail extends Copy {
  collection: Collection;
  game: Game;
}

/**
 * Copy shape consumed by CopyModal: always has `game`; `collection`/`checkOuts`
 * may be present depending on the source endpoint. Both GameCopy and CopyDetail
 * are assignable to this.
 */
export interface CopyForEditor extends Copy {
  game: Game;
  collection?: Collection;
  checkOuts?: CheckOut[];
}

/** ConventionCollectionEntity — join row with its resolved collection. */
export interface ConventionCollectionWithCollection extends ConventionCollections {
  // convention() always includes the collection (+ its `_count`).
  collection: CollectionWithCount;
}

/** ConventionWithCollectionsEntity — `/con/:id`. */
export interface ConventionWithCollections extends Convention {
  collections: ConventionCollectionWithCollection[];
}

/** UserOrganizationPermissionsWithUserEntity — `/userOrgPerm/organization/:id`. */
export interface UserOrganizationPermissionsWithUser extends UserOrganizationPermissions {
  user: User;
}

/** UserConventionPermissionsWithUserEntity — `/userConPerm/convention/:id`. */
export interface UserConventionPermissionsWithUser extends UserConventionPermissions {
  user: User;
}

/** UserConventionPermissionsWithConventionEntity — permissions endpoint. */
export interface UserConventionPermissionsWithConvention extends UserConventionPermissions {
  convention: Convention;
}

/**
 * A user-permission row rendered by UserGrid/UserCard/UserModal. The org and
 * convention list endpoints each return their own permission joined with `user`
 * (UserOrganizationPermissionsWithUser / UserConventionPermissionsWithUser);
 * components branch on `userType`, so role flags exclusive to one side are
 * optional here.
 */
export interface UserPermissionRow {
  id: number;
  userId: number;
  organizationId?: number;
  conventionId?: number;
  admin: boolean;
  geekGuide: boolean;
  readOnly?: boolean;
  attendee?: boolean;
  user: User;
  conventions?: { conventionId: number }[];
}

// ---------------------------------------------------------------------------
// Pagination + composite envelopes
// ---------------------------------------------------------------------------

/** PaginatedGamesDto — `/game/withCopies`, `/org/:id/games/withCopies`. */
export interface PaginatedGames {
  data: GameWithCopies[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/** `/collection/:id/copiesByGames` — a collection plus its paginated games. */
export interface CollectionCopiesByGames extends Collection {
  games: GameWithCopies[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/** `/org/:id/games/autocomplete/:name` — id/name pairs. */
export interface GameAutocompleteItem {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Permissions (`/permissions/:email`, PermissionsResponseDto)
// ---------------------------------------------------------------------------

/**
 * Org permission as returned by the permissions endpoint. The service includes
 * `organization` and synthesizes admin entries for owned orgs that carry only
 * `admin` + `organization` (role flags / `user` absent), so those are optional.
 */
export interface OrganizationPermissionWithOrg {
  id: number;
  userId: number;
  organizationId: number;
  admin: boolean;
  geekGuide?: boolean;
  readOnly?: boolean;
  organization: Organization;
  user?: User;
}

/** PermissionsResponseDto (organizations/conventions carry their relations). */
export interface PermissionsResponse {
  user: User;
  organizations: OrganizationPermissionWithOrg[];
  conventions: UserConventionPermissionsWithConvention[];
}
