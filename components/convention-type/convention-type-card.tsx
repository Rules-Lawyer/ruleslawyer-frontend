"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import { Skeleton } from "@heroui/react";
import { useDisclosure } from "@/utilities/useDisclosure";
import { BiSolidMessageAltError } from "react-icons/bi";
import { PiTreeViewBold } from "react-icons/pi";
import usePermissions from "@/utilities/swr/usePermissions";
import ConventionTypeModal from "./convention-type-modal";
import { ConventionType } from "@/types/models";

interface ConventionTypeCardProps {
  conventionTypeIn: ConventionType;
  onUpdated?: (updated: Partial<ConventionType>) => void;
}

export default function UserCard(props: ConventionTypeCardProps) {
  const { conventionTypeIn, onUpdated } = props;

  const [conventionType, setData] = useState<ConventionType | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  useEffect(() => {
    if (conventionTypeIn) {
      setData(conventionTypeIn);
      setLoading(false);
    }
  }, [conventionTypeIn, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (conventionType) {
        if (
          permissions.organizations.data?.filter(
            (d) => d.organizationId == conventionType.organizationId && d.admin === true,
          ).length > 0
        ) {
          setReadOnly(false);
        }

        setLoading(false);
      }
    } else {
      setReadOnly(true);
    }
  }, [
    permissions.user?.data,
    permissions.organizations?.data,
    conventionType,
  ]);

  const onModalClose = () => {};

  const disclosure = useDisclosure({
    onClose: onModalClose,
  });

  const { isOpen: isOpen, onOpen: onOpen, onClose: onClose } = disclosure;

  if (isLoading || isLoadingPermissions) {
    return (
      <div className="flex items-center border-2 w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] border-slate-800">
        <div className="flex-col p-3 w-24">
          <PiTreeViewBold size={64} className="text-slate-800" />
        </div>
        <div className="flex-col pr-3 w-full">
          <Skeleton className="rounded-lg">
            <div className="inline-block align-middle h-full"></div>
          </Skeleton>
        </div>
      </div>
    );
  }

  if (!conventionType) {
    return (
      <div className="flex items-center border-2 w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] border-slate-800">
        <div className="flex-col p-3 w-24">
          <BiSolidMessageAltError size={64} className="text-slate-500" />
        </div>
        <div className="flex-col pr-3 w-full">
          <div className="inline-block align-middle h-full">
            <span className="inline-block align-middle h-full">
              Error loading user
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center border-2 w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] border-gwblue"
      onClick={onOpen}
    >
      <div className="flex-col p-3 w-24">
        <PiTreeViewBold size={64} />
      </div>
      <div className="flex-col pr-3 w-40">
        <div className="inline-block align-middle h-full">
          <p>
            {conventionType?.name !== ""
              ? conventionType?.name
              : "[unknown convention type]"}
          </p>
        </div>
      </div>

      <ConventionTypeModal
        conventionTypeIn={conventionType}
        disclosure={disclosure}
        onSaved={(updated) => {
          setData((prev) => ({ ...prev, ...updated }) as ConventionType);
          onUpdated?.(updated);
        }}
        organizationId={conventionType.id}
      />
    </div>
  );
}
