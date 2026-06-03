"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import {
  Button,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem
} from "@heroui/react";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import {
  now,
  getLocalTimeZone,
  parseAbsoluteToLocal,
  ZonedDateTime,
} from "@internationalized/date";
import { useDisclosure } from "@heroui/react";
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

  const { isOpen, onOpen, onClose } = disclosure;

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

  if (isLoading || isLoadingPermissions || isLoadingConventionTypes)
    return <div></div>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollBehavior="outside">
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
                {conventionId ? "Edit" : "Create"} Convention
              </ModalHeader>
              <ModalBody>
                <Select
                  name="conventionTypeSelect"
                  items={conventionTypes ?? []}
                  label="Convention Type"
                  placeholder="Select a convention type"
                  defaultSelectedKeys={conventionTypeId != null ? [String(conventionTypeId)] : []}
                  isDisabled={readOnly}
                  onChange={(event) => {
                    setConventionTypeId(Number(event.target.value));
                  }}
                >
                  {(conventionType) => (
                    <SelectItem
                      key={conventionType.id}
                    >
                      {conventionType.name}
                    </SelectItem>
                  )}
                </Select>
                <Input
                  name="name"
                  type="text"
                  isRequired
                  label="Name"
                  value={conventionName}
                  onValueChange={(value) => setConventionName(value)}
                  isDisabled={readOnly}
                />
                <Input
                  name="theme"
                  type="text"
                  label="Theme"
                  value={conventionTheme}
                  onValueChange={(value) => setConventionTheme(value)}
                  isDisabled={readOnly}
                />
                <Input
                  name="tteConventionId"
                  type="text"
                  label="TTE Convention Id"
                  placeholder="Enter the convention id from Tabletop.Events"
                  value={tteConventionId ?? ""}
                  onValueChange={(value) => setTTEConventionId(value)}
                  isDisabled={readOnly}
                />
                <DatePicker
                  label="Start Date"
                  isRequired
                  showMonthAndYearPickers
                  onChange={(value) => setStartDate(value)}
                  defaultValue={startDate}
                />
                <DatePicker
                  label="End Date"
                  isRequired
                  showMonthAndYearPickers
                  onChange={(value) => setEndDate(value)}
                  defaultValue={endDate}
                />
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
