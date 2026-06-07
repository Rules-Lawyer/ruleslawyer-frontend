import { Auth0Provider } from "@auth0/nextjs-auth0";
import { cookies } from "next/headers";
import SideBar from "@/components/ui/sidebar";
import { SIDEBAR_STORAGE_KEY } from "@/utilities/constants";
import { LegacyUrlsProvider } from "@/components/convention/legacy-urls-context";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialCollapsed =
    (await cookies()).get(SIDEBAR_STORAGE_KEY)?.value === "true";

  // Read at request time (this layout is dynamic via cookies()), so these are
  // the container's runtime env values injected by CDK, not build-time inlined.
  const legacyUrls = {
    adminUrl: process.env.LEGACY_ADMIN_URL ?? "",
    librarianUrl: process.env.LEGACY_LIBRARIAN_URL ?? "",
    playPrizeEntryUrl: process.env.LEGACY_PLAY_PRIZE_ENTRY_URL ?? "",
  };

  return (
    <Auth0Provider>
      <LegacyUrlsProvider value={legacyUrls}>
        <div className="flex h-full min-h-screen">
          <SideBar initialCollapsed={initialCollapsed} />
          <div className="pt-5 pr-10 w-full">{children}</div>
        </div>
      </LegacyUrlsProvider>
    </Auth0Provider>
  );
}
