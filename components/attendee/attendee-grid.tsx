"use client";
import React, { useEffect, useState } from "react";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import usePermissions from "@/utilities/swr/usePermissions";
import AttendeeCard from "./attendee-card";
import { Attendee } from "@/types/models";
import { Spinner, Input, Label, TextField, Button } from "@heroui/react";
import { SimpleSelect, SimpleSelectItem } from "@/components/ui/simple-select";
import { SimpleTooltip } from '@/components/ui/simple-tooltip';
import Pagination from "../ui/pagination";
import AttendeeMissingBadgeModal from "./atttendee-missing-badge-modal";
import AttendeeImportCSVModal from './atttendee-import-csv-modal';
import { useDisclosure } from "@/utilities/useDisclosure";
import AttendeeModal from "./attendee-modal";
import { IoMdAddCircle } from "react-icons/io";
import { RiImportLine } from "react-icons/ri";

interface AttendeeGridProps {
  attendeesIn?: Attendee[];
  conventionId?: number;
  organizationId?: number;
}

export default function AttendeeGrid(props: AttendeeGridProps) {
  const { attendeesIn, conventionId, organizationId } = props;

  const [attendees, setData] = useState<Attendee[] | null>(null);
  const [pronouns, setPronouns] = useState<{ id: number; pronouns: string }[]>(
    [],
  );
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [maxResults, setMaxResults] = useState<string>("50");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [trigger, setTrigger] = useState(0);
  const [readOnly, setReadOnly] = useState(true);

  const missingBadgeDisclosure = useDisclosure();
  const createAttendeeDisclosure = useDisclosure();
  const createAttendeeImportDisclosure = useDisclosure();

  const { isOpen: isOpenMissingBadge, onOpen: onOpenMissingBadge } = missingBadgeDisclosure;
  const { isOpen: isOpenCreateAttendee, onOpen: onOpenCreateAttendee } = createAttendeeDisclosure;
  const { isOpen: isOpenCreateAttendeeImport, onOpen: onOpenCreateAttendeeImport } = createAttendeeImportDisclosure;

  const { permissions } = usePermissions();

  const session = useAuth();

  const onModalClose = () => {
    setTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    frontendFetch("GET", "/attendee/pronouns", null, session?.data?.token)
      .then((res) => res.json())
      .then((pronounsData) => setPronouns(pronounsData))
      .catch(() => {});
  }, [session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (conventionId) {
        if (
          permissions.conventions.data?.filter(
            (d) => d.conventionId == conventionId && d.admin === true,
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          if (
            permissions.organizations.data?.filter(
              (d) => d.organizationId == organizationId && d.admin === true,
            ).length > 0
          ) {
            setReadOnly(false);
          }
        }
      } else {
        setReadOnly(true);
      }
    }
  }, [
    permissions.user?.data,
    permissions.organizations?.data,
    permissions.conventions?.data,
    conventionId,
    organizationId,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // A new search or page size invalidates the current page offset; go back to
  // the first page. (setPage(1) is a no-op when already on page 1, so this
  // doesn't cause an extra fetch in the common case.)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, maxResults]);

  useEffect(() => {
    setLoading(true);
  }, [maxResults]);

  useEffect(() => {
    // A caller-supplied list bypasses the server entirely (no paging).
    if (attendeesIn) {
      setData(attendeesIn);
      setTotal(attendeesIn.length);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    const token = session?.data?.token;
    if (!token || !conventionId) return;

    frontendFetch(
      "GET",
      "/con/" +
        conventionId +
        "/attendees" +
        "?limit=" +
        maxResults +
        "&page=" +
        page +
        "&filter=" +
        encodeURIComponent(debouncedSearch),
      null,
      token,
    )
      .then((res) => res.json())
      .then((data) => {
        setData(data.data);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setLoading(false);
      })
      .catch(() => {});
  }, [
    attendeesIn,
    conventionId,
    session?.data?.token,
    maxResults,
    debouncedSearch,
    page,
    trigger,
  ]);

  if (isLoading) {
    return (
      <div className="flex justify-center w-full pt-10">
        <Spinner aria-label="Loading..." />
      </div>
    );
  }

  const pagination = (
    <Pagination
      page={page}
      totalPages={totalPages}
      total={total}
      noun="attendees"
      onPageChange={setPage}
    />
  );

  return (
    <div>
      <div className="flex m-10">
        <TextField
          name="search"
          aria-label="Search Attendees"
          onChange={setSearchText}
          className="mr-10 w-2/3"
        >
          <Label>Search Attendees</Label>
          <Input placeholder="Type a name" />
        </TextField>
        <SimpleSelect
          name="maxResults"
          label="Max Results"
          selectedKey={maxResults}
          onSelectionChange={(key) => {
            if (key != null) {
              setMaxResults(String(key));
            }
          }}
          className="w-1/3"
        >
          <SimpleSelectItem id="50" textValue="50 Attendees" />
          <SimpleSelectItem id="100" textValue="100 Attendees" />
          <SimpleSelectItem id="500" textValue="500 Attendees" />
        </SimpleSelect>
      </div>

      <div className="flex items-center mx-10">
        <div className="flex-1 flex justify-start my-6">
          <Button onPress={onOpenMissingBadge}>Unable to find an Attendee Badge?</Button>
        </div>
        <div className="flex-1 flex justify-center">{pagination}</div>
        <div className="flex-1" />
      </div>
      <div className="flex flex-wrap">
        {attendees?.map((u) => (
          <AttendeeCard
            key={u.id}
            attendeeIn={u}
            attendeeId={u.id}
            pronounsIn={pronouns}
            conventionId={conventionId}
            organizationId={organizationId}
            onModalClose={onModalClose}
          />
        ))}
      </div>

      {pagination}

      {readOnly ? (
        null
      ) : (
        <SimpleTooltip
          content="Import Attendees From CSV"
          delay={1000}
          ariaLabel="Import Attendees From CSV"
          triggerClassName="text-7xl fixed bottom-28 right-8 hover:text-gwgreen hover:cursor-pointer"
          onPress={onOpenCreateAttendeeImport}
        >
          <RiImportLine aria-hidden="true" />
        </SimpleTooltip>
      )}

      {readOnly ? (
        null
      ) : (
        <SimpleTooltip
          content="Create Attendee Badge"
          delay={1000}
          ariaLabel="Create Attendee Badge"
          triggerClassName="text-7xl fixed bottom-8 right-8 hover:text-gwgreen hover:cursor-pointer"
          onPress={onOpenCreateAttendee}
        >
          <IoMdAddCircle aria-hidden="true" />
        </SimpleTooltip>
      )}

      {isOpenMissingBadge && (
        <AttendeeMissingBadgeModal disclosure={missingBadgeDisclosure} />
      )}

      <AttendeeModal disclosure={createAttendeeDisclosure} pronounsIn={pronouns} conventionId={conventionId}></AttendeeModal>
      <AttendeeImportCSVModal disclosure={createAttendeeImportDisclosure} conventionId={conventionId}></AttendeeImportCSVModal>
    </div>
  );
}
