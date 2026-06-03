"use client";
import React, { useEffect, useState } from "react";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import usePermissions from "@/utilities/swr/usePermissions";
import AttendeeCard from "./attendee-card";
import { Attendee } from "@/types/models";

interface AttendeeGridProps {
  attendeesIn?: Attendee[];
  conventionId?: number;
  organizationId?: number;
}

export default function AttendeeGrid(props: AttendeeGridProps) {
  const { attendeesIn, conventionId, organizationId } = props;

  const [attendees, setData] = useState<Attendee[] | null>(null);
  const [pronouns, setPronouns] = useState<{ id: number; pronouns: string }[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions } = usePermissions();

  const session = useAuth();

  useEffect(() => {
    frontendFetch("GET", "/attendee/pronouns", null, session?.data?.token)
      .then((res) => res.json())
      .then((pronounsData) => setPronouns(pronounsData))
      .catch(() => {});
  }, [session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (conventionId) {
        if (
          permissions.conventions.data?.filter(
            (d) =>
              d.conventionId == conventionId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          if (permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == organizationId && d.admin === true
          ).length > 0) {
            setReadOnly(false);
          }
        }
      } else {
        setReadOnly(true);
      }
    }
  }, [permissions.user?.data, permissions.conventions?.data, conventionId, organizationId]);

  useEffect(() => {
    if (attendeesIn) {
      setData(attendeesIn);
      setLoading(false);
    } else if (conventionId) {
      frontendFetch(
        "GET",
        "/con/" + conventionId + "/attendees",
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {});
    }
  }, [attendeesIn, conventionId, session?.data?.token]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-wrap">
        {attendees
          ?.slice()
          .sort((u1, u2) =>
            (u1.badgeLastName ?? "").localeCompare(u2.badgeLastName ?? "")
          )
          .map(
            (u) => {
              return (
                <AttendeeCard
                  key={u.id}
                  attendeeIn={u}
                  pronounsIn={pronouns}
                  conventionId={conventionId}
                  organizationId={organizationId}
                />
              );
            }
          )
        }
      </div>
    </div>
  );
}
