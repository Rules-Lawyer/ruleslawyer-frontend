"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import { Button, Modal } from "@heroui/react";
import { SimpleTextField } from "@/components/ui/simple-field";
import { SimpleSelect, SimpleSelectItem } from "@/components/ui/simple-select";
import { SimpleDatePicker } from "@/components/ui/simple-datepicker";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import {
  now,
  getLocalTimeZone,
  parseAbsoluteToLocal,
  ZonedDateTime,
} from "@internationalized/date";
import { useDisclosure } from "@/utilities/useDisclosure";
import { Convention, ConventionType } from "@/types/models";

interface ConventionModalProps {
  conventionIn?: Convention;
  conventionId?: number;
  organizationId?: number;
  disclosure: ReturnType<typeof useDisclosure>;
}

export default function ConventionModal(props: ConventionModalProps) {
  const { conventionIn, conventionId, organizationId, disclosure } = props;

  const [convention, setData] = useState<Convention | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [conventionTypes, setConventionTypes] = useState<
    ConventionType[] | null
  >(null);
  const [isLoadingConventionTypes, setLoadingConventionTypes] =
    useState(true);
  const [conventionTypeId, setConventionTypeId] = useState<number | undefined>(
    undefined
  );
  const [conventionName, setConventionName] = useState("");
  const [conventionTheme, setConventionTheme] = useState("");
  const [tteConventionId, setTTEConventionId] = useState<string | null>("");
  const [startDate, setStartDate] = useState<ZonedDateTime | null>(now(getLocalTimeZone()).set({second: 0, millisecond: 0}));
  const [startTime, setStartTime] = useState<ZonedDateTime | null>(now(getLocalTimeZone()).set({second: 0, millisecond: 0}));
  const [endDate, setEndDate] = useState<ZonedDateTime | null>(null);
  const [endTime, setEndTime] = useState<ZonedDateTime | null>(null);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { onClose } = disclosure;

  const onSave = () => {
    if (convention) {
      frontendFetch(
        "PUT",
        "/con/" + convention.id,
        {
          name: conventionName,
          theme: conventionTheme,
          tteConventionId: tteConventionId,
          startDate: startDate?.toAbsoluteString(),
          endDate: endDate?.toAbsoluteString(),
          type: {
            connect: {
              id: conventionTypeId,
            },
          },
        },
        session?.data?.token
      )
        .then((res) => {
          if (!res.ok) {
            toastSaveError(res);
            return undefined;
          }
          return res.json();
        })
        .then((data) => {
          if (!data) return;
          onClose();
        })
        .catch(() => {
          toastNetworkError();
        });
    } else {
      frontendFetch(
        "POST",
        "/org/" + organizationId + "/con",
        {
          name: conventionName,
          theme: conventionTheme,
          tteConventionId: tteConventionId,
          startDate: startDate?.toAbsoluteString(),
          endDate: endDate?.toAbsoluteString(),
          type: {
            connect: {
              id: conventionTypeId,
            },
          },
        },
        session?.data?.token
      )
        .then((res) => {
          if (!res.ok) {
            toastSaveError(res);
            return undefined;
          }
          return res.json();
        })
        .then((data) => {
          if (!data) return;
          onClose();
        })
        .catch(() => {
          toastNetworkError();
        });
    }
  };

  useEffect(() => {
    if (conventionIn) {
      setData(conventionIn);

      setConventionName(conventionIn.name);
      setConventionTheme(conventionIn.theme);
      setTTEConventionId(conventionIn.tteConventionId);
      setConventionTypeId(conventionIn.typeId);

      const parsedStart = parseAbsoluteToLocal(conventionIn.startDate).set({second: 0, millisecond: 0});
      const parsedEnd = parseAbsoluteToLocal(conventionIn.endDate).set({second: 0, millisecond: 0});

      setStartDate(parsedStart);
      setStartTime(parsedStart);
      setEndDate(parsedEnd);
      setEndTime(parsedEnd);

      setLoading(false);
    } else if (conventionId) {
      frontendFetch("GET", "/con/" + conventionId, null, session?.data?.token)
        .then((res) => res.json())
        .then((data) => {
          setData(data);

          setConventionName(data.name);
          setConventionTheme(data.theme);
          setTTEConventionId(data.tteConventionId);
          setConventionTypeId(data.typeId);

          const parsedStart = parseAbsoluteToLocal(data.startDate).set({second: 0, millisecond: 0});
          const parsedEnd = parseAbsoluteToLocal(data.endDate).set({second: 0, millisecond: 0});

          setStartDate(parsedStart);
          setStartTime(parsedStart);
          setEndDate(parsedEnd);
          setEndTime(parsedEnd);

          setLoading(false);
        })
        .catch((err) => {});
    } else {
      setStartDate(now(getLocalTimeZone()));
      setEndDate(now(getLocalTimeZone()));
      setLoading(false);
    }
  }, [conventionId, conventionIn, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (convention) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == convention.organizationId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          if (
            permissions.conventions?.data?.filter(
              (d) =>
                d.conventionId == convention.id && d.admin === true
            ).length > 0
          ) {
            setReadOnly(false);
          } else {
            setReadOnly(true);
          }
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
  }, [permissions.user?.data, permissions.organizations?.data, permissions.conventions?.data, convention, organizationId]);

  useEffect(() => {
    if (organizationId) {
      frontendFetch(
        "GET",
        "/org/" + organizationId + "/conventionType",
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setConventionTypes(data);
          setLoadingConventionTypes(false);
        })
        .catch((err) => {});
    }
  }, [organizationId, session?.data?.token]);

  // Render nothing while closed so HeroUI Modal/DialogTrigger does not mount
  // a (hidden, thus non-focusable) trigger — e.g. inside collapsed Accordion panels.
  if (!disclosure.isOpen) return null;
  if (isLoading || isLoadingPermissions || isLoadingConventionTypes)
    return <div></div>;

  return (
    <Modal state={disclosure}>
      {/* hidden trigger so HeroUI DialogTrigger has a pressable child; see game-modal.tsx */}
      <Modal.Trigger tabIndex={-1} />
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
                    {conventionId ? "Edit" : "Create"} Convention
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <SimpleSelect
                    name="conventionTypeSelect"
                    label="Convention Type"
                    placeholder="Select a convention type"
                    className="mb-4"
                    selectedKey={
                      conventionTypeId != null
                        ? String(conventionTypeId)
                        : null
                    }
                    isDisabled={readOnly}
                    onSelectionChange={(key) => {
                      setConventionTypeId(
                        key != null ? Number(key) : undefined
                      );
                    }}
                  >
                    {(conventionTypes ?? []).map((conventionType) => (
                      <SimpleSelectItem
                        key={conventionType.id}
                        id={String(conventionType.id)}
                        textValue={conventionType.name}
                      />
                    ))}
                  </SimpleSelect>
                  <SimpleTextField
                    name="name"
                    isRequired
                    label="Name"
                    value={conventionName}
                    onChange={(value) => setConventionName(value)}
                    isDisabled={readOnly}
                  />
                  <SimpleTextField
                    name="theme"
                    label="Theme"
                    value={conventionTheme}
                    onChange={(value) => setConventionTheme(value)}
                    isDisabled={readOnly}
                  />
                  <SimpleTextField
                    name="tteConventionId"
                    label="TTE Convention Id"
                    value={tteConventionId ?? ""}
                    onChange={(value) => setTTEConventionId(value)}
                    isDisabled={readOnly}
                  />
                  <SimpleDatePicker
                    label="Start Date"
                    isRequired
                    onChange={(value) =>
                      setStartDate(value as ZonedDateTime | null)
                    }
                    defaultValue={startDate}
                  />
                  <SimpleDatePicker
                    label="End Date"
                    isRequired
                    onChange={(value) =>
                      setEndDate(value as ZonedDateTime | null)
                    }
                    defaultValue={endDate}
                  />
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
