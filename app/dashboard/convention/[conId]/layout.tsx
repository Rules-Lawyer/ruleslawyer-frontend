"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import { BreadcrumbsItem, Breadcrumbs } from "@heroui/react";
import { useParams, usePathname } from "next/navigation";
import { Collection, Convention } from "@/types/models";

export default function ConventionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [convention, setData] = useState<Convention | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setLoading] = useState(true);

  const session = useAuth();
  const pathname = usePathname();
  const params = useParams();

  const conId = params?.conId;
  const colId = params?.colId;
  const token = session?.data?.token;

  useEffect(() => {
    if (!conId || !token) return;
    frontendFetch("GET", "/con/" + conId, null, token)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {});
  }, [conId, token]);

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

  if (isLoading) return <p>Loading...</p>;
  if (!convention) return <p>No convention data</p>;

  return (
    <div>
      <div className="mb-5">
        <Breadcrumbs>
          {params?.conId !== null && params?.conId !== undefined ? (
            <BreadcrumbsItem href={`/dashboard/convention/${convention.id}`}>
              {convention.name}
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {pathname?.includes("collection") ? (
            <BreadcrumbsItem
              href={`/dashboard/convention/${convention.id}/collections`}
            >
              Collections
            </BreadcrumbsItem>
          ) : (
            null
          )}

          {params?.colId !== null && params?.colId !== undefined ? (
            <BreadcrumbsItem
              href={`/dashboard/organization/${convention.id}/collection/${params?.colId}`}
            >
              {collection?.name}
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
