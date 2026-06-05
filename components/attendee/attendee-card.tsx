"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import { Skeleton } from "@heroui/react";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useDisclosure } from "@/utilities/useDisclosure";
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
  attendeeId: number;
  onModalClose?: () => void;
}

export default function AttendeeCard(props: AttendeeCardProps) {
  const { attendeeIn, pronounsIn, conventionId, organizationId, attendeeId, onModalClose } = props;
  const disclosure = useDisclosure({ onClose: onModalClose });
  const transferDisclosure = useDisclosure({ onClose: onModalClose });
  const lostBadgeDisclosure = useDisclosure({ onClose: onModalClose });

  const { isOpen, onOpen } = disclosure;
  const { isOpen: isOpenTransfer, onOpen: onOpenBadgeTransfer } = transferDisclosure;
  const { isOpen: isOpenLostBadge, onOpen: onOpenLostBadge } = lostBadgeDisclosure;

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
        "/attendee/" + attendeeId,
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch(() => {});
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


  if (isLoading || isLoadingPermissions) {
    return (
      <div className="flex items-center border-2 w-100 h-40 mr-5 mb-5 bg-gwdarkblue border-slate-800">
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
      <div className="flex items-center border-2 w-100 h-40 mr-5 mb-5 bg-gwdarkblue border-slate-800">
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
            : null
          }
          {attendee.email ?
            <div className="align-middle h-full text-sm pt-3 text-slate-300">
              {attendee.email}
            </div>
            : null
          }
        </div>
        {!readOnly ? (
          <div className="absolute top-5 right-5">
            <SimpleTooltip
              content={`Edit ${attendee.badgeName}`}
              delay={1000}
              ariaLabel={"Edit " + attendee.badgeName}
              triggerClassName="hover:text-gwgreen hover:cursor-pointer"
              onPress={onOpen}
            >
              <FaEdit aria-hidden="true" className="text-2xl" />
            </SimpleTooltip>
          </div>
        ) : null}
        {!readOnly ? (
          <div className="absolute top-15 right-5">
            <SimpleTooltip
              content={`Transfer ${attendee.badgeName}`}
              delay={1000}
              ariaLabel={"Transfer " + attendee.badgeName}
              triggerClassName="hover:text-gwgreen hover:cursor-pointer"
              onPress={onOpenBadgeTransfer}
            >
              <FaMoneyBillTransfer aria-hidden="true" className="text-2xl" />
            </SimpleTooltip>
          </div>
        ) : null}
        {!readOnly ? (
          <div className="absolute top-25 right-5">
            <SimpleTooltip
              content={`Report ${attendee.badgeName}'s badge lost and replace`}
              delay={1000}
              ariaLabel={"Report " + attendee.badgeName + "'s badge lost and replace"}
              triggerClassName="hover:text-gwgreen hover:cursor-pointer"
              onPress={onOpenLostBadge}
            >
              <LuReplace aria-hidden="true" className="text-2xl" />
            </SimpleTooltip>
          </div>
        ) : null}
      </div>

      {isOpen && (
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
      )}

      {isOpenTransfer && (
        <AttendeeTransferModal
          attendeeId={attendee.id}
          attendeeIn={attendee}
          conventionId={attendee.conventionId}
          pronounsIn={pronounsIn}
          disclosure={transferDisclosure}
          organizationId={organizationId}
        />
      )}

      {isOpenLostBadge && (
        <AttendeeLostBadgeModal
          attendeeId={attendee.id}
          attendeeIn={attendee}
          conventionId={attendee.conventionId}
          disclosure={lostBadgeDisclosure}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
