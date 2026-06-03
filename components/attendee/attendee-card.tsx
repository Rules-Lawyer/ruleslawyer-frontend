"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import { Skeleton, useDisclosure } from "@heroui/react";
import { BiSolidMessageAltError } from "react-icons/bi";
import usePermissions from "@/utilities/swr/usePermissions";
import { FaRegIdBadge } from "react-icons/fa6";
import AttendeeModal from "./attendee-modal";
import { Attendee } from "@/types/models";

interface AttendeeCardProps {
  attendeeIn: Attendee;
  pronounsIn: { id: number; pronouns: string }[];
  conventionId?: number;
  organizationId?: number;
}

export default function AttendeeCard(props: AttendeeCardProps) {
  const { attendeeIn, pronounsIn, conventionId, organizationId } = props;

  const [attendee, setData] = useState<Attendee | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  useEffect(() => {
    if (attendeeIn) {
      setData(attendeeIn);
      setLoading(false);
    } else {
      frontendFetch(
        "GET",
        "/userConPerm/" + (attendeeIn as Attendee).id,
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
  }, [attendeeIn, session?.data?.token]);

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
      }
    } else {
      setReadOnly(true);
    }
  }, [permissions.user?.data, permissions.organizations?.data, permissions.conventions?.data, conventionId, organizationId]);

  const onModalClose = () => {
  };

  const disclosure = useDisclosure({
    onClose: onModalClose,
  });

  const { isOpen: isOpen, onOpen: onOpen, onClose: onClose } = disclosure;

  if (isLoading || isLoadingPermissions) {
    return (
      <div className="flex items-center border-2 w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] border-slate-800">
        <div className="flex-col p-3 w-24">
          <FaRegIdBadge size={64} className="text-slate-800" />
        </div>
        <div className="flex-col pr-3 w-full">
          <Skeleton className="rounded-lg">
            <div className="inline-block align-middle h-full"></div>
          </Skeleton>
        </div>
      </div>
    );
  }

  if (!attendee) {
    return (
      <div className="flex items-center border-2 w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] border-slate-800">
        <div className="flex-col p-3 w-24">
          <BiSolidMessageAltError size={64} className="text-slate-500" />
        </div>
        <div className="flex-col pr-3 w-full">
          <div className="inline-block align-middle h-full">
            <span className="inline-block align-middle h-full">
              Error loading attendee
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div
          role="button"
          tabIndex={0}
          aria-label={"Edit " + (attendee.badgeName !== "" ? attendee.badgeName : "attendee")}
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen();
            }
          }}
          className="relative flex items-center border-2 border-gwblue w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] cursor-pointer"
        >
        <div className="flex-col p-3 w-24">
            <FaRegIdBadge size={64} />
        </div>
        <div className="flex-col pr-3 w-48">
            <div className="inline-block align-middle h-full font-bold">
              {attendee.badgeNumber}
            </div>
            <div className="inline-block align-middle h-full">
                {attendee.badgeName}
            </div>
            {attendee.pronounsId ?
              <div className="inline-block align-middle h-full text-sm pt-3 text-slate-300">
                {attendee.pronouns?.pronouns}
              </div>
              : <div></div>
            }
            {attendee.email ?
              <div className="inline-block align-middle h-full text-sm pt-3 text-slate-300">
                {attendee.email}
              </div>
              : <div></div>
            }
        </div>
      </div>

      <AttendeeModal
          attendeeIn={attendee}
          conventionId={attendee.conventionId}
          pronounsIn={pronounsIn}
          disclosure={disclosure}
          organizationId={organizationId}
          onSaved={(updated) =>
              setData((prev) => (prev ? { ...prev, ...updated } : prev))
          }
      />
    </div>
  );
}
