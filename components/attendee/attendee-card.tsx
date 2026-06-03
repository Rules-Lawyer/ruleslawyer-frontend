"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import { Skeleton, Tooltip, useDisclosure } from "@heroui/react";
import { BiSolidMessageAltError } from "react-icons/bi";
import usePermissions from "@/utilities/swr/usePermissions";
import { FaMoneyBillTransfer, FaRegIdBadge } from "react-icons/fa6";
import AttendeeModal from "./attendee-modal";
import { Attendee } from "@/types/models";
import { FaEdit } from "react-icons/fa";
import { LuReplace } from "react-icons/lu";
import AttendeeTransferModal from "./atttendee-transfer-badge-modal";
import AttendeeLostBadgeModal from "./atttendee-lost-badge-modal";

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

  const transferDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const { isOpen: isOpenTransfer, onOpen: onOpenBadgeTransfer, onClose: onCloseBadgeTransfer } = transferDisclosure;

  const lostBadgeDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const { isOpen: isOpenLostBadge, onOpen: onOpenLostBadge, onClose: onCloseLostBadge } = lostBadgeDisclosure;

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
    <div className="w-100 mr-5">
      <div className="relative flex items-center border-2 border-gwblue h-40 mr-5 mb-5 bg-gwdarkblue w-full">
        <div className="flex-col p-3 w-24">
            <FaRegIdBadge size={64} />
        </div>
        <div className="flex-col pr-3 w-full">
          <div className="align-middle h-full font-bold">
            #{attendee.badgeNumber}
          </div>
          <div className="align-middle h-full">
              {attendee.badgeName}
          </div>
          {attendee.pronounsId ?
            <div className="align-middle h-full text-sm pt-3 text-slate-300">
              {attendee.pronouns?.pronouns}
            </div>
            : <div></div>
          }
          {attendee.email ?
            <div className="align-middle h-full text-sm pt-3 text-slate-300">
              {attendee.email}
            </div>
            : <div></div>
          }
        </div>
        {!readOnly ? (
          <div className="absolute top-5 right-5">
            <Tooltip
              content={"Edit " + attendee.badgeName}
              showArrow={true}
              color="success"
              delay={1000}
            >
              <button
                type="button"
                aria-label={"Edit " + attendee.badgeName}
                className="hover:text-gwgreen hover:cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpen();
                }}
              >
                <FaEdit aria-hidden="true" className="text-2xl" />
              </button>
            </Tooltip>
          </div>
        ) : (
          ""
        )}
        {!readOnly ? (
          <div className="absolute top-15 right-5">
            <Tooltip
              content={"Transfer " + attendee.badgeName}
              showArrow={true}
              color="success"
              delay={1000}
            >
              <button
                type="button"
                aria-label={"Transfer " + attendee.badgeName}
                className="hover:text-gwgreen hover:cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenBadgeTransfer();
                }}
              >
                <FaMoneyBillTransfer aria-hidden="true" className="text-2xl" />
              </button>
            </Tooltip>
          </div>
        ) : (
          ""
        )}
        {!readOnly ? (
          <div className="absolute top-25 right-5">
            <Tooltip
              content={"Report " + attendee.badgeName + "'s badge lost and replace"}
              showArrow={true}
              color="success"
              delay={1000}
            >
              <button
                type="button"
                aria-label={"Report " + attendee.badgeName + "'s badge lost and replace"}
                className="hover:text-gwgreen hover:cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenLostBadge();
                }}
              >
                <LuReplace aria-hidden="true" className="text-2xl" />
              </button>
            </Tooltip>
          </div>
        ) : (
          ""
        )}
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

      <AttendeeTransferModal
          attendeeIn={attendee}
          conventionId={attendee.conventionId}
          pronounsIn={pronounsIn}
          disclosure={transferDisclosure}
          organizationId={organizationId}
      />

      <AttendeeLostBadgeModal
          attendeeIn={attendee}
          conventionId={attendee.conventionId}
          pronounsIn={pronounsIn}
          disclosure={lostBadgeDisclosure}
          organizationId={organizationId}
      />
    </div>
  );
}
