"use client";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useDisclosure } from "@/utilities/useDisclosure";
import React, { useEffect, useState } from "react";
import { IoMdAddCircle } from "react-icons/io";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import usePermissions from "@/utilities/swr/usePermissions";
import UserCard from "./user-card";
import UserModal from "./user-modal";
import { UserPermissionRow } from "@/types/models";

interface UserGridProps {
  usersIn?: UserPermissionRow[];
  organizationId?: number;
  conventionId?: number;
  userType: "organization" | "convention";
}

export default function UserGrid(props: UserGridProps) {
  const { usersIn, organizationId, conventionId, userType } = props;

  const [users, setData] = useState<UserPermissionRow[] | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions } = usePermissions();

  const session = useAuth();

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (organizationId) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == organizationId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          setReadOnly(true);
        }
      } else {
        setReadOnly(true);
      }
    }
  }, [permissions.user?.data, permissions.organizations?.data, organizationId]);

  useEffect(() => {
    if (usersIn) {
      setData(usersIn);
      setLoading(false);
    } else if (organizationId) {
      frontendFetch(
        "GET",
        "/userOrgPerm/organization/" + organizationId,
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {});
    } else if (conventionId) {
      frontendFetch(
        "GET",
        "/userConPerm/convention/" + conventionId,
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
  }, [usersIn, organizationId, conventionId, session?.data?.token]);

  const onModalClose = () => {
    if (userType === 'organization') {
      frontendFetch(
        "GET",
        "/userOrgPerm/organization/" + organizationId,
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {});
    } else if (userType === 'convention') {
      frontendFetch(
        "GET",
        "/userConPerm/convention/" + conventionId,
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
  };

  const createDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const {
    isOpen: isOpenCreate,
    onOpen: onOpenCreate,
    onClose: onCloseCreate,
  } = createDisclosure;

  const importDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const {
    isOpen: isOpenImport,
    onOpen: onOpenImport,
    onClose: onCloseImport,
  } = importDisclosure;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-wrap">
        {users
          ?.slice()
          .sort((u1, u2) =>
            (u1.user.name ?? "").localeCompare(u2.user.name ?? "")
          )
          .map(
            (u) => {
              return (
                <UserCard
                  key={u.id}
                  userIn={u}
                  onDeleted={onModalClose}
                  userType={userType}
                />
              );
            }
          )
        }
      </div>

      {readOnly ? (
        null
      ) : (
        <SimpleTooltip
          content="Add User"
          delay={1000}
          ariaLabel="Add User"
          triggerClassName="text-7xl fixed bottom-8 right-8 hover:text-gwgreen hover:cursor-pointer"
          onPress={onOpenCreate}
        >
          <IoMdAddCircle aria-hidden="true" />
        </SimpleTooltip>
      )}

      <UserModal
        disclosure={createDisclosure}
        organizationId={organizationId}
        conventionId={conventionId}
        userType={userType}
      ></UserModal>
    </div>
  );
}
