"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { SignOut } from "./auth/signout-client";
import { CircularProgress } from "@heroui/react";
import usePermissions from "@/utilities/swr/usePermissions";
import { FaBuildingFlag, FaPeopleLine, FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import { IoLibrary } from "react-icons/io5";
import { GiPawn } from "react-icons/gi";
import { SIDEBAR_STORAGE_KEY } from "@/utilities/constants";
import { useUser } from "@auth0/nextjs-auth0";

export default function SideBar({
  initialCollapsed = false,
}: {
  initialCollapsed?: boolean;
}) {
  const { permissions, isLoading } = usePermissions();

  const { user } = useUser();

  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const navRef = useRef<HTMLDivElement>(null);
  const hasRedirected = useRef(false);

  // /dashboard is an empty shell; once permissions load, send the user to their
  // first available section. The destination is read from the first rendered nav
  // link (rather than re-deriving the branching above) so it always matches what
  // the nav shows — including the orgs-less / conventions-only case. replace()
  // keeps the blank /dashboard out of history so Back doesn't bounce here.
  useEffect(() => {
    if (isLoading || hasRedirected.current || pathname !== "/dashboard") return;
    const target = navRef.current?.querySelector("a")?.getAttribute("href");
    if (target) {
      hasRedirected.current = true;
      router.replace(target);
    }
  }, [isLoading, pathname, router]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  };

  const containerClass = clsx("mr-10", collapsed ? "min-w-16" : "min-w-48");

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className="text-center bg-gwdarkgreen h-48 rounded-br-lg">
          <div className="flex justify-center w-full pt-10">
            <CircularProgress isIndeterminate={true} label="Loading..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className={clsx("flex bg-gwgreen border-b-2 border-gwblue", collapsed ? "justify-center" : "justify-end")}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="p-2 text-gwdarkblue hover:text-gwdarkgreen hover:cursor-pointer"
        >
          {collapsed ? <FaAnglesRight aria-hidden="true" /> : <FaAnglesLeft aria-hidden="true" />}
        </button>
      </div>
      <div ref={navRef}>
        {permissions.organizations.data?.length === 1 &&
          !permissions.user?.data?.superAdmin && (
            <Link className="group"
              aria-label={permissions.organizations.data[0].organization.name}
              href={`/dashboard/organization/${permissions.organizations.data[0].organizationId}`}
            >
              <div
                className={clsx(
                  "text-center border-b-2 border-gwblue group-hover:bg-gwblue p-2",
                  {
                    "bg-transparent": pathname.startsWith(`/dashboard/organization`) && !pathname.includes(`/conventions`) && !pathname.includes(`/games`) && !pathname.includes(`/collection`),
                  },
                  {
                    "bg-gwgreen border-right-2": !pathname.startsWith(`/dashboard/organization`) || pathname.includes(`/conventions`) || pathname.includes(`/games`) || pathname.includes(`/collection`),
                  }
                )}
              >
                <FaBuildingFlag
                  className={clsx(
                    "text-4xl mx-auto",
                    !collapsed && "mb-2",
                    {
                      "text-gwgreen group-hover:text-gwdarkgreen": pathname.startsWith(`/dashboard/organization`) && !pathname.includes(`/conventions`) && !pathname.includes(`/games`) && !pathname.includes(`/collection`),
                    },
                    {
                      "text-gwdarkblue group-hover:text-gwdarkgreen": !pathname.startsWith(`/dashboard/organization`) || pathname.includes(`/conventions`) || pathname.includes(`/games`) || pathname.includes(`/collection`),
                    }
                  )}
                />

                {!collapsed && permissions.organizations.data[0].organization.name}
              </div>
            </Link>
          )}
        {(permissions.organizations.data?.length > 1 ||
          permissions.user?.data?.superAdmin) && (
          <Link className="group" aria-label="Organizations" href="/dashboard/organizations">
            <div
              className={clsx(
                "text-center border-b-2 border-gwblue group-hover:bg-gwblue p-2",
                {
                  "bg-transparent": pathname?.startsWith(
                    "/dashboard/organization"
                  ),
                },
                {
                  "bg-gwgreen border-right-2": !pathname?.startsWith(
                    "/dashboard/organization"
                  ),
                }
              )}
            >
              <FaBuildingFlag
                className={clsx(
                  "text-4xl mx-auto",
                  !collapsed && "mb-2",
                  {
                    "text-gwgreen group-hover:text-gwdarkgreen": pathname?.startsWith(
                      `/dashboard/organization`
                    ),
                  },
                  {
                    "text-gwdarkblue group-hover:text-gwdarkgreen": !pathname?.startsWith(
                      `/dashboard/organization`
                    ),
                  }
                )}
              />

              {!collapsed && "Organizations"}
            </div>
          </Link>
        )}
        { permissions.organizations.data?.length === 1 &&
          !permissions.user?.data?.superAdmin && (
          <Link className="group"
            aria-label="Conventions"
            href={`/dashboard/organization/${permissions.organizations.data[0].organizationId}/conventions`}
          >
            <div
              className={clsx(
                "text-center border-b-2 border-gwblue group-hover:bg-gwblue p-2",
                {
                  "bg-transparent": pathname?.startsWith(
                    `/dashboard/organization/${permissions.organizations.data[0].organizationId}/conventions`
                  ),
                },
                {
                  "bg-gwgreen border-right-2": !pathname?.startsWith(
                    `/dashboard/organization/${permissions.organizations.data[0].organizationId}/conventions`
                  ),
                }
              )}
            >
              <FaPeopleLine
                  className={clsx(
                    "text-4xl mx-auto",
                    !collapsed && "mb-2",
                    {
                      "text-gwgreen group-hover:text-gwgreen": pathname?.startsWith(
                        `/dashboard/organization/${permissions.organizations.data[0].organizationId}/conventions`
                      ),
                    },
                    {
                      "text-gwdarkblue group-hover:text-gwdarkgreen": !pathname?.startsWith(
                        `/dashboard/organization/${permissions.organizations.data[0].organizationId}/conventions`
                      ),
                    }
                  )}
                />

              {!collapsed && `${new Set(
                permissions.conventions.data?.map(
                  (c: { convention: { organizationId: number } }) =>
                    c.convention.organizationId
                )
              ).size > 1 ? `${permissions.organizations.data[0].organization.name} ` : ''} Conventions`}
            </div>
          </Link>
        )}
        {((permissions.conventions.data?.length > 0 &&
          new Set(
            permissions.conventions.data?.map(
              (c: { convention: { organizationId: number } }) =>
                c.convention.organizationId
            )
          ).size > 1) ||
          (permissions.conventions.data?.length > 0 &&
            permissions.organizations.data.length === 0) ||
          permissions.user?.data?.superAdmin) && (
            <Link className="group" aria-label="All Conventions" href={`/dashboard/conventions`}>
              <div
                className={clsx(
                  "text-center border-b-2 border-gwblue group-hover:bg-gwblue p-2",
                  {
                    "bg-transparent": pathname?.startsWith(
                      `/dashboard/convention`
                    ),
                  },
                  {
                    "bg-gwgreen border-right-2": !pathname?.startsWith(
                      `/dashboard/convention`
                    ),
                  }
                )}
              >
                <FaPeopleLine
                  className={clsx(
                    "text-4xl mx-auto",
                    !collapsed && "mb-2",
                    {
                      "text-gwgreen group-hover:text-gwdarkgreen": pathname?.startsWith(
                        `/dashboard/convention`
                      ),
                    },
                    {
                      "text-gwdarkblue group-hover:text-gwdarkgreen": !pathname?.startsWith(
                        `/dashboard/convention`
                      ),
                    }
                  )}
                />

                {!collapsed && "All Conventions"}
              </div>
            </Link>
          )}
        {permissions.organizations.data?.length === 1 &&
          !permissions.user?.data?.superAdmin && (
            <Link className="group"
              aria-label="Games"
              href={`/dashboard/organization/${permissions.organizations.data[0].organizationId}/games`}
            >
              <div
                className={clsx(
                  "text-center border-b-2 border-gwblue group-hover:bg-gwblue p-2",
                  {
                    "bg-transparent border-right-0": pathname?.startsWith(
                      `/dashboard/organization/${permissions.organizations.data[0].organizationId}/games`
                    ),
                  },
                  {
                    "bg-gwgreen border-right-2": !pathname?.startsWith(
                      `/dashboard/organization/${permissions.organizations.data[0].organizationId}/games`
                    ),
                  }
                )}
              >
                <GiPawn
                  className={clsx(
                    "text-4xl mx-auto",
                    !collapsed && "mb-2",
                    {
                      "text-gwgreen group-hover:text-gwdarkgreen": pathname?.startsWith(
                        `/dashboard/organization/${permissions.organizations.data[0].organizationId}/games`
                      ),
                    },
                    {
                      "text-gwdarkblue group-hover:text-gwdarkgreen": !pathname?.startsWith(
                        `/dashboard/organization/${permissions.organizations.data[0].organizationId}/games`
                      ),
                    }
                  )}
                />

                {!collapsed && "Games"}
              </div>
            </Link>
          )}
        {permissions.organizations.data?.length === 1 &&
          !permissions.user?.data?.superAdmin && (
            <Link className="group"
              aria-label="Collections"
              href={`/dashboard/organization/${permissions.organizations.data[0].organizationId}/collections`}
            >
              <div
                className={clsx(
                  "text-center border-b-2 border-gwblue group-hover:bg-gwblue p-2",
                  {
                    "bg-transparent border-right-0": pathname?.startsWith(
                      `/dashboard/organization/${permissions.organizations.data[0].organizationId}/collection`
                    ),
                  },
                  {
                    "bg-gwgreen border-right-2": !pathname?.startsWith(
                      `/dashboard/organization/${permissions.organizations.data[0].organizationId}/collection`
                    ),
                  }
                )}
              >
                <IoLibrary
                  className={clsx(
                    "text-4xl mx-auto",
                    !collapsed && "mb-2",
                    {
                      "text-gwgreen group-hover:text-gwdarkgreen": pathname?.startsWith(
                        `/dashboard/organization/${permissions.organizations.data[0].organizationId}/collection`
                      ),
                    },
                    {
                      "text-gwdarkblue group-hover:text-gwdarkgreen": !pathname?.startsWith(
                        `/dashboard/organization/${permissions.organizations.data[0].organizationId}/collection`
                      ),
                    }
                  )}
                />

                {!collapsed && "Collections"}
              </div>
            </Link>
          )}
      </div>
      <div className="text-center pt-10 bg-gwdarkgreen h-48 rounded-br-lg ">
        {user?.picture && (
          <Image
            className="mx-auto"
            src={user?.picture ?? ''}
            width={50}
            height={50}
            alt="Profile Picture"
          />
        )}

        {(!collapsed && user?.name) ?? ""}
        <br/>
        <SignOut collapsed={collapsed} />
      </div>
    </div>
  );
}
