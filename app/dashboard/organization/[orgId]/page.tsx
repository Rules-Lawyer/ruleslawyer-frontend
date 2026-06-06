"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import { Organization } from "@/types/models";
import Link from "next/link";
import React, { useEffect, useState, use } from "react";
import { FaPeopleLine } from "react-icons/fa6";
import { FaUsersCog } from "react-icons/fa";
import { GiPawn } from "react-icons/gi";
import { IoLibrary } from "react-icons/io5";
import { PiTreeViewBold } from "react-icons/pi";

type Params = Promise<{ orgId: string }>;

export default function OrgView(props: { params: Params }) {
  const params = use(props.params);

  const [organization, setData] = useState<Organization | null>(null);
  const [isLoading, setLoading] = useState(true);

  const session = useAuth();

  useEffect(() => {
    frontendFetch("GET", "/org/" + params.orgId, null, session?.data?.token)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {});
  }, [params.orgId, session?.data?.token]);

  if (isLoading) return <p>Loading...</p>;
  if (!organization) return <p>No organization data</p>;

  return (
    <div className="flex flex-row flex-wrap gap-9 items-center text-center">
      <div>
        <Link
          href={`/dashboard/organization/${params.orgId}/conventions`}
          className="hover:text-gwgreen"
        >
          <FaPeopleLine className="text-8xl" />
          Conventions
        </Link>
      </div>
      <div>
        <Link
          href={`/dashboard/organization/${params.orgId}/games`}
          className="hover:text-gwgreen"
        >
          <GiPawn className="text-8xl" />
          Games
        </Link>
      </div>
      <div>
        <Link
          href={`/dashboard/organization/${params.orgId}/collections`}
          className="hover:text-gwgreen"
        >
          <IoLibrary className="text-8xl" />
          Collections
        </Link>
      </div>
      <div>
        <Link
          href={`/dashboard/organization/${params.orgId}/users`}
          className="hover:text-gwgreen"
        >
          <FaUsersCog className="text-8xl" />
          Users
        </Link>
      </div>
      <div>
        <Link
          href={`/dashboard/organization/${params.orgId}/convention-types`}
          className="hover:text-gwgreen"
        >
          <PiTreeViewBold className="text-8xl" />
          Convention Types
        </Link>
      </div>
    </div>
  );
}
