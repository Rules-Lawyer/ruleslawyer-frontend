"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import {
  toastDeleteError,
  toastDeleteNetworkError,
} from "@/utilities/toastFetchError";
import { Skeleton } from "@heroui/react";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useDisclosure } from "@/utilities/useDisclosure";
import { BiSolidMessageAltError } from "react-icons/bi";
import { IoLibrary } from "react-icons/io5";
import usePermissions from "@/utilities/swr/usePermissions";
import { FaTrashCan, FaUser } from "react-icons/fa6";
import UserModal from "./user-modal";
import { UserPermissionRow } from "@/types/models";

interface UserCardProps {
  userIn: UserPermissionRow;
  onDeleted: () => void;
  userType: "organization" | "convention";
}

export default function UserCard(props: UserCardProps) {
  const { userIn, onDeleted, userType } = props;

  const [user, setData] = useState<UserPermissionRow | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  useEffect(() => {
    if (userIn) {
      setData(userIn);
      setLoading(false);
    } else {
      // Dead branch: userIn is always provided by callers. Kept as-is.
      frontendFetch(
        "GET",
        "/userConPerm/" + (userIn as UserPermissionRow).id,
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
  }, [userIn, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (user) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == user.organizationId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          if (
            permissions.conventions.data?.filter(
              (d) =>
                user.conventions?.some(
                  (c) => d.conventionId == c.conventionId
                ) && d.admin === true
            ).length > 0
          ) {
            setReadOnly(false);
          } else {
            setReadOnly(true);
          }

          setLoading(false);
        }

        setLoading(false);
      }
    } else {
      setReadOnly(true);
    }
  }, [permissions.user?.data, permissions.organizations?.data, permissions.conventions?.data, user]);

  const onModalClose = () => {
  };

  const disclosure = useDisclosure({
    onClose: onModalClose,
  });

  const { isOpen: isOpen, onOpen: onOpen, onClose: onClose } = disclosure;


  const deleteUser = () => {
    if (userType === 'organization') {
      if (confirm("Are you sure you want to delete this user?")) {
        frontendFetch(
          "DELETE",
          "/userOrgPerm/" + user?.id,
          {},
          session?.data?.token
        )
          .then((res) => {
            if (!res.ok) {
              toastDeleteError(res);
              return;
            }
            onDeleted();
          })
          .catch(() => {
            toastDeleteNetworkError();
          });
      }
    } else if (userType === 'convention') {
      if (confirm("Are you sure you want to delete this user?")) {
        frontendFetch(
          "DELETE",
          "/userConPerm/" + user?.id,
          {},
          session?.data?.token
        )
          .then((res) => {
            if (!res.ok) {
              toastDeleteError(res);
              return;
            }
            onDeleted();
          })
          .catch(() => {
            toastDeleteNetworkError();
          });
      }
    }
  };

  if (isLoading || isLoadingPermissions) {
    return (
      <div className="flex items-center border-2 w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] border-slate-800">
        <div className="flex-col p-3 w-24">
          <IoLibrary size={64} className="text-slate-800" />
        </div>
        <div className="flex-col pr-3 w-full">
          <Skeleton className="rounded-lg">
            <div className="inline-block align-middle h-full"></div>
          </Skeleton>
        </div>
      </div>
    );
  }

  if (!user) {
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
    <div>
        <div
          role="button"
          tabIndex={0}
          aria-label={"Edit " + (user.user.name !== "" ? user.user.name : "user")}
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
            <FaUser size={64} />
        </div>
        <div className="flex-col pr-3 w-40">
            <div className="inline-block align-middle h-full">
                <p>
                    {user.user.name !== ""
                    ? user.user.name
                    : "[unknown user]"}
                </p>
            </div>
            <div className="inline-block align-middle h-full text-sm pt-3 text-slate-300">
                <p>
                    {user.user.email !== ""
                    ? user.user.email
                    : "[unknown user]"}
                </p>
            </div>
            {userType === "organization" ? (
              <div className="align-middle h-full text-sm pt-3 text-slate-400">
                  {[
                      user.admin ? "Admin" : null,
                      user.geekGuide ? "Geek Guide" : null,
                      user.readOnly ? "Read Only" : null,
                  ]
                      .filter(Boolean)
                      .join(" | ")}
              </div>
            ) : (
              null
            )}
            {userType === "convention" ? (
              <div className="align-middle h-full text-sm pt-3 text-slate-400">
                  {[
                      user.admin ? "Admin" : null,
                      user.attendee ? "Attendee" : null,
                      user.geekGuide ? "Geek Guide" : null,
                      user.readOnly ? "Read Only" : null,
                  ]
                      .filter(Boolean)
                      .join(" | ")}
              </div>
            ) : (
              null
            )}
        </div>
        {!readOnly ? (
            <div className="absolute top-15 right-10">
            {" "}
            <SimpleTooltip
                content={"Delete " + user.user.name}
                delay={1000}
                ariaLabel={"Delete " + (user.user.name !== "" ? user.user.name : "user")}
                triggerClassName="hover:text-gwgreen hover:cursor-pointer"
                onPress={deleteUser}
            >
                <FaTrashCan aria-hidden="true" />
            </SimpleTooltip>
            </div>
        ) : (
            null
        )}
        </div>

        <UserModal
            userIn={user}
            organizationId={user.organizationId}
            disclosure={disclosure}
            onSaved={(updated) =>
                setData((prev) => ({ ...prev, ...updated }) as UserPermissionRow)
            }
            userType={userType}
        />
    </div>
  );
}
