"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import { useDisclosure } from "@heroui/react";
import { UserPermissionRow } from "@/types/models";

interface UserPermissionUpdate {
  admin: boolean;
  geekGuide: boolean;
  readOnly?: boolean;
  attendee?: boolean;
}

interface UserModalProps {
  userIn?: UserPermissionRow;
  organizationId?: number;
  disclosure: ReturnType<typeof useDisclosure>;
  userId?: number;
  onSaved?: (updated: UserPermissionUpdate) => void;
  userType: "organization" | "convention";
  conventionId?: number;
}

export default function UserModal(props: UserModalProps) {
  const {
    userIn,
    organizationId,
    disclosure,
    userId,
    onSaved,
    userType,
    conventionId
  } = props;

  const [user, setData] = useState<UserPermissionRow | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userAdmin, setUserAdmin] = useState(false);
  const [userGeekGuide, setUserGeekGuide] = useState(false);
  const [userReadOnly, setUserReadOnly] = useState(false);
  const [userAttendee, setUserAttendee] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);

  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { isOpen, onOpen, onClose } = disclosure;

  const onSave = () => {
    if (userType === "organization") {
      if (userIn) {
        frontendFetch(
          "PUT",
          "/userOrgPerm/" + user?.id,
          {
              admin: userAdmin,
              geekGuide: userGeekGuide,
              readOnly: userReadOnly,
          },
          session?.data?.token
        )
        .then((res) => {
            if (!res.ok) {
                toastSaveError(res);
                return;
            }
            onSaved?.({
                admin: userAdmin,
                geekGuide: userGeekGuide,
                readOnly: userReadOnly,
            });
            onClose();
          })
          .catch(() => {
              toastNetworkError();
          });
      } else {
        frontendFetch(
          "POST",
          "/userOrgPerm/organization/" + organizationId + "/addUser",
          {
              email: userEmail,
              admin: userAdmin,
              geekGuide: userGeekGuide,
              readOnly: userReadOnly,
          },
          session?.data?.token
        )
        .then((res) => {
            if (!res.ok) {
                toastSaveError(res);
                return;
            }
            onSaved?.({
                admin: userAdmin,
                geekGuide: userGeekGuide,
                readOnly: userReadOnly,
            });
            onClose();
          })
          .catch(() => {
              toastNetworkError();
          });
      }
    } else if (userType === "convention") {
      if (userIn) {
        frontendFetch(
          "PUT",
          "/userConPerm/" + user?.id,
          {
              admin: userAdmin,
              geekGuide: userGeekGuide,
              attendee: userAttendee,
          },
          session?.data?.token
        )
        .then((res) => {
            if (!res.ok) {
                toastSaveError(res);
                return;
            }
            onSaved?.({
                admin: userAdmin,
                geekGuide: userGeekGuide,
                attendee: userAttendee,
            });
            onClose();
          })
          .catch(() => {
              toastNetworkError();
          });
      } else {
        frontendFetch(
          "POST",
          "/userConPerm/convention/" + conventionId + "/addUser",
          {
              email: userEmail,
              admin: userAdmin,
              geekGuide: userGeekGuide,
              attendee: userAttendee,
          },
          session?.data?.token
        )
        .then((res) => {
            if (!res.ok) {
                toastSaveError(res);
                return;
            }
            onSaved?.({
                admin: userAdmin,
                geekGuide: userGeekGuide,
                attendee: userAttendee,
            });
            onClose();
          })
          .catch(() => {
              toastNetworkError();
          });
      }
    }
  };

  useEffect(() => {
    if (userIn) {
      setData(userIn);

      setLoading(false);
    } else if (userId) {
      frontendFetch(
        "GET",
        "/userOrgPerm/" + userId,
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);

          setLoading(false);
        })
        .catch((err) => {});
    } else {
      setLoading(false);
    }
  }, [userId, userIn, session?.data?.token]);

  useEffect(() => {
    if (user && isOpen) {
      setUserAdmin(user.admin ?? false);
      setUserGeekGuide(user.geekGuide ?? false);
      setUserReadOnly(user.readOnly ?? false);
      setUserAttendee(user.attendee ?? false);
    }
  }, [user, isOpen]);

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
        }
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
    } else {
      setReadOnly(true);
    }
  }, [permissions.user?.data, permissions.organizations?.data, user, organizationId]);

  if (isLoading || isLoadingPermissions) return <div></div>;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        {(onClose) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <div>
              <ModalHeader>
                User Editor - {user?.user?.name ?? "New User"}
              </ModalHeader>
              <ModalBody>
                {!user?.user?.name ? (
                  <Input
                    label="Email"
                    onValueChange={setUserEmail}
                  />
                ) : (
                  null
                )}
                {userType === "organization" ? (
                  <div>
                    <Checkbox
                      isSelected={userAdmin}
                      onValueChange={setUserAdmin}
                      isDisabled={readOnly}
                    >
                      Admin
                    </Checkbox>
                    <br/><br/>
                    <Checkbox
                      isSelected={userGeekGuide}
                      onValueChange={setUserGeekGuide}
                      isDisabled={readOnly}
                    >
                      Geek Guide
                    </Checkbox>
                    <br/><br/>
                    <Checkbox
                      isSelected={userReadOnly}
                      onValueChange={setUserReadOnly}
                      isDisabled={readOnly}
                    >
                      Read Only
                    </Checkbox>
                  </div>
                ) : (
                  null
                )}

                {userType === "convention" ? (
                  <div>
                    <Checkbox
                      isSelected={userAdmin}
                      onValueChange={setUserAdmin}
                      isDisabled={readOnly}
                    >
                      Admin
                    </Checkbox>
                    <br/><br/>
                    <Checkbox
                      isSelected={userGeekGuide}
                      onValueChange={setUserGeekGuide}
                      isDisabled={readOnly}
                    >
                      Geek Guide
                    </Checkbox>
                    <br/><br/>
                    <Checkbox
                      isSelected={userAttendee}
                      onValueChange={setUserAttendee}
                      isDisabled={readOnly}
                    >
                      Attendee
                    </Checkbox>
                  </div>
                ) : (
                  null
                )}
              </ModalBody>
              <ModalFooter>
                {readOnly ? (
                  null
                ) : (
                  <Button color="success" type="submit">
                    Save
                  </Button>
                )}
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
