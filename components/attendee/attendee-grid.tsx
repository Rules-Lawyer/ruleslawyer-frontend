"use client";
import React, { useEffect, useState } from "react";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import usePermissions from "@/utilities/swr/usePermissions";
import AttendeeCard from "./attendee-card";
import { Attendee } from "@/types/models";
import {
  CircularProgress,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { LuUserSearch } from "react-icons/lu";
import Pagination from "../pagination";

interface AttendeeGridProps {
  attendeesIn?: Attendee[];
  conventionId?: number;
  organizationId?: number;
}

export default function AttendeeGrid(props: AttendeeGridProps) {
  const { attendeesIn, conventionId, organizationId } = props;

  const [attendees, setData] = useState<Attendee[] | null>(null);
  const [pronouns, setPronouns] = useState<{ id: number; pronouns: string }[]>([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [maxResults, setMaxResults] = useState<string>("50");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [trigger, setTrigger] = useState(0);
  const [, setReadOnly] = useState(true);

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
      } else {
        setReadOnly(true);
      }
    }
  }, [permissions.user?.data, permissions.organizations?.data, permissions.conventions?.data, conventionId, organizationId]);

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
        "?limit=" + maxResults +
        "&page=" + page +
        "&filter=" + encodeURIComponent(debouncedSearch),
      null,
      token
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
        <CircularProgress isIndeterminate={true} label="Loading..." />
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
        <Input
          name="search"
          type="text"
          label="Search Attendees"
          placeholder="Type a name"
          startContent={<LuUserSearch />}
          onValueChange={setSearchText}
          className="mr-10"
        />
        <Select
          name="maxResults"
          label="Max Results"
          onSelectionChange={(keys) => {
            const [first] = keys;

            if (first !== undefined) {
              setMaxResults(String(first));
            }
          }}
          selectedKeys={new Set([maxResults])}
          className="w-1/3"
        >
          <SelectItem key={50}>50 Attendees</SelectItem>
          <SelectItem key={100}>100 Attendees</SelectItem>
          <SelectItem key={500}>500 Attendees</SelectItem>
        </Select>
      </div>

      {pagination}

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
    </div>
  );
}
