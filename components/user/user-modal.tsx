"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import { Button, Modal } from "@heroui/react";
import { SimpleTextField } from "@/components/ui/simple-field";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import { useDisclosure } from "@/utilities/useDisclosure";
import { UserPermissionRow } from "@/types/models";
import { SimpleCheckbox } from "@/components/ui/simple-checkbox";

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

  const { isOpen, onClose } = disclosure;

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
    <Modal state={disclosure}>
      <Modal.Backdrop>
        <Modal.Container scroll="outside">
          <Modal.Dialog>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
            >
              <div>
                <Modal.Header>
                  <Modal.Heading>
                    User Editor - {user?.user?.name ?? "New User"}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  {!user?.user?.name ? (
                    <SimpleTextField label="Email" onChange={setUserEmail} />
                  ) : (
                    null
                  )}
                  {userType === "organization" ? (
                    <div>
                      <SimpleCheckbox
                        isSelected={userAdmin}
                        onChange={setUserAdmin}
                        isDisabled={readOnly}
                        label="Admin"
                        aria-label="Admin"
                        id="admin"
                      />
                      <br/>
                      <SimpleCheckbox
                        isSelected={userGeekGuide}
                        onChange={setUserGeekGuide}
                        isDisabled={readOnly}
                        label="Geek Guide"
                        aria-label="Geek Guide"
                        id="geek-guide"
                      />
                      <br/>
                      <SimpleCheckbox
                        isSelected={userReadOnly}
                        onChange={setUserReadOnly}
                        isDisabled={readOnly}
                        label="Read Only"
                        aria-label="Read Only"
                        id="read-only"
                      />
                    </div>
                  ) : (
                    null
                  )}

                  {userType === "convention" ? (
                    <div>
                      <Checkbox
                        isSelected={userAdmin}
                        onChange={setUserAdmin}
                        isDisabled={readOnly}
                      >
                        Admin
                      </Checkbox>
                      <br/><br/>
                      <Checkbox
                        isSelected={userGeekGuide}
                        onChange={setUserGeekGuide}
                        isDisabled={readOnly}
                      >
                        Geek Guide
                      </Checkbox>
                      <br/><br/>
                      <Checkbox
                        isSelected={userAttendee}
                        onChange={setUserAttendee}
                        isDisabled={readOnly}
                      >
                        Attendee
                      </Checkbox>
                    </div>
                  ) : (
                    null
                  )}
                </Modal.Body>
                <Modal.Footer>
                  {readOnly ? (
                    null
                  ) : (
                    <Button variant="primary" type="submit">
                      Save
                    </Button>
                  )}
                  <Button variant="secondary" onPress={onClose}>
                    Close
                  </Button>
                </Modal.Footer>
              </div>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
