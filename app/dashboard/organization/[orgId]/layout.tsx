"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
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
        <Breadcrumbs size="lg" color="success" underline="hover">
          {params?.orgId !== null && params?.orgId !== undefined ? (
            <BreadcrumbItem href={`/dashboard/organization/${organization.id}`}>
              {organization.name}
            </BreadcrumbItem>
          ) : (
            null
          )}

          {pathname?.includes("users") ? (
            <BreadcrumbItem
              href={`/dashboard/organization/${organization.id}/users`}
            >
              Users
            </BreadcrumbItem>
          ) : (
            null
          )}

          {pathname?.includes("convention") ? (
            <BreadcrumbItem
              href={`/dashboard/organization/${organization.id}/conventions`}
            >
              Conventions
            </BreadcrumbItem>
          ) : (
            null
          )}

          {params?.conId !== null && params?.conId !== undefined ? (
            <BreadcrumbItem
              href={`/dashboard/organization/${organization.id}/convention/${convention?.id}`}
            >
              {convention?.name}
            </BreadcrumbItem>
          ) : (
            null
          )}

          {pathname?.includes("collection") ? (
            <BreadcrumbItem
              href={`/dashboard/organization/${organization.id}/collections`}
            >
              Collections
            </BreadcrumbItem>
          ) : (
            null
          )}

          {params?.colId !== null && params?.colId !== undefined ? (
            <BreadcrumbItem
              href={`/dashboard/organization/${organization.id}/collection/${params.colId}`}
            >
              {collection?.name}
            </BreadcrumbItem>
          ) : (
            null
          )}

          {pathname?.includes("games") ? (
            <BreadcrumbItem
              href={`/dashboard/organization/${organization.id}/games`}
            >
              Games
            </BreadcrumbItem>
          ) : (
            null
          )}
        </Breadcrumbs>
      </div>
      <div>{children}</div>
    </div>
  );
}
