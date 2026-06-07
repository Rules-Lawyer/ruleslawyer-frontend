"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import { BreadcrumbsItem, Breadcrumbs } from "@heroui/react";
import { useParams, usePathname } from "next/navigation";
import { Collection, Convention, Organization } from "@/types/models";

export default function OrganizationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [organization, setData] = useState<Organization | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [convention, setConvention] = useState<Convention | null>(null);
  const [isLoading, setLoading] = useState(true);

  const session = useAuth();
  const pathname = usePathname();
  const params = useParams();

  const orgId = params?.orgId;
  const colId = params?.colId;
  const conId = params?.conId;
  const token = session?.data?.token;

  useEffect(() => {
    if (!orgId || !token) return;
    frontendFetch("GET", "/org/" + orgId, null, token)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {});
  }, [orgId, token]);

  useEffect(() => {
    if (!colId || !token) return;
    frontendFetch("GET", "/collection/" + colId, null, token)
      .then((res) => res.json())
      .then((data) => {
        setCollection(data);
        setLoading(false);
      })
      .catch(() => {});
  }, [colId, token]);

  useEffect(() => {
    if (!conId || !token) return;
    frontendFetch("GET", "/con/" + conId, null, token)
      .then((res) => res.json())
      .then((data) => {
        setConvention(data);
        setLoading(false);
      })
      .catch(() => {});
  }, [conId, token]);

  if (isLoading) return <p>Loading...</p>;
  if (!organization) return <p>No organization data</p>;

  return (
    <div>
      <div className="mb-5">
        <Breadcrumbs className="flex-wrap gap-y-1">
          {params?.orgId !== null && params?.orgId !== undefined ? (
            <BreadcrumbsItem href={`/dashboard/organization/${organization.id}`}>
              {organization.name}
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {pathname?.includes("users") ? (
            <BreadcrumbsItem
              href={`/dashboard/organization/${organization.id}/users`}
            >
              Users
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {params?.orgId !== null && params?.orgId !== undefined && pathname?.endsWith('convention-types') ? (
            <BreadcrumbsItem>
              Convention Types
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {pathname?.includes("convention") && !pathname?.endsWith('convention-types') ? (
            <BreadcrumbsItem
              href={`/dashboard/organization/${organization.id}/conventions`}
            >
              Conventions
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {params?.conId !== null && params?.conId !== undefined ? (
            <BreadcrumbsItem
              href={`/dashboard/organization/${organization.id}/convention/${convention?.id}`}
            >
              {convention?.name}
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {pathname?.includes("collection") ? (
            <BreadcrumbsItem
              href={`/dashboard/organization/${organization.id}/collections`}
            >
              Collections
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {params?.colId !== null && params?.colId !== undefined ? (
            <BreadcrumbsItem
              href={`/dashboard/organization/${organization.id}/collection/${params.colId}`}
            >
              {collection?.name}
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {pathname?.includes("games") ? (
            <BreadcrumbsItem
              href={`/dashboard/organization/${organization.id}/games`}
            >
              Games
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {params?.conId !== null && params?.conId !== undefined && pathname?.endsWith('users') ? (
            <BreadcrumbsItem>
              Users
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {params?.conId !== null && params?.conId !== undefined && pathname?.endsWith('attendees') ? (
            <BreadcrumbsItem>
              Attendees
            </BreadcrumbsItem>
          ) : (
            null
          )}
        </Breadcrumbs>
      </div>
      <div>{children}</div>
    </div>
  );
}
