"use client";
import React, { useEffect, useState } from "react";
import GameCard from "./game-card";
import {
  CircularProgress,
  Input,
  Select,
  SelectItem,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { LuPackageSearch } from "react-icons/lu";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import { IoMdAddCircle } from "react-icons/io";
import CopyModal from "../copy/copy-modal";
import usePermissions from "@/utilities/swr/usePermissions";
import { Collection, GameWithCopies } from "@/types/models";
import Pagination from "../pagination";

interface GameGridProps {
  collectionId?: number;
  organizationId?: number;
  showHeader?: boolean;
}

export default function GameGrid(props: GameGridProps) {
  const { collectionId, organizationId, showHeader } = props;

  const [games, setData] = useState<GameWithCopies[] | null>(null);
  const [header, setHeader] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [maxResults, setMaxResults] = React.useState<string>("50");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [trigger, setTrigger] = useState(0);
  const [readOnly, setReadOnly] = useState(true);
  const [collection, setCollection] = useState<Collection | null>(null);

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
    const token = session?.data?.token;
    if (!token) return;

    if (collectionId) {
      frontendFetch(
        "GET",
        "/collection/" +
          collectionId,
        null,
        token
      )
        .then((res) => res.json())
        .then((data) => {
          setCollection(data);
        })
        .catch(() => {})
        .then(() => {
          frontendFetch(
            "GET",
            "/collection/" +
              collectionId +
              "/copiesByGames" +
              "?orgId=" + organizationId +
              "&limit=" + maxResults +
              "&page=" + page +
              "&filter=" + encodeURIComponent(debouncedSearch),
            null,
            token
          )
            .then((res) => res.json())
            .then((data) => {
              setHeader("Collection: " + data.name);
              setData(data.games);
              setTotal(data.total ?? 0);
              setTotalPages(data.totalPages ?? 1);
              setLoading(false);
            })
            .catch(() => {});
        })
    } else {
      frontendFetch(
        "GET",
        "/game/withCopies" +
          "?orgId=" + organizationId +
          "&limit=" + maxResults +
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
    }
  }, [
    session?.data?.token,
    collectionId,
    organizationId,
    maxResults,
    debouncedSearch,
    page,
    trigger,
  ]);

  useEffect(() => {
    const interval = setInterval(() => setTrigger((t: number) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const onModalClose = () => {
    setTrigger(trigger + 1);
  };

  const createDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const { onOpen: onOpenCreate } = createDisclosure;

  if (isLoading) {
    return (
      <div className="flex justify-center w-full pt-10">
        <CircularProgress isIndeterminate={true} label="Loading..." />
      </div>
    );
  }

  return (
    <div>
      {showHeader ? <h1>{header}</h1> : ""}
      <div className="flex m-10">
        <Input
          name="search"
          type="text"
          label="Search Games"
          placeholder="Type a game name"
          startContent={<LuPackageSearch />}
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
          <SelectItem key={50}>
            50 Games
          </SelectItem>
          <SelectItem key={100}>
            100 Games
          </SelectItem>
          <SelectItem key={500}>
            500 Games
          </SelectItem>
        </Select>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        noun="games"
        onPageChange={setPage}
      />

      <div className="flex flex-wrap">
        {games?.map(
          (g) => {
            return <GameCard key={g.id} gameIn={g} gameId={g.id} archived={collection?.archived} />;
          }
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        noun="games"
        onPageChange={setPage}
      />

      {readOnly ? (
        null
      ) : (
        <Tooltip
          content="Create Game"
          showArrow={true}
          color="success"
          delay={1000}
        >
          <button
            type="button"
            aria-label="Create Game"
            onClick={onOpenCreate}
            className="text-7xl fixed bottom-8 right-8 hover:text-gwgreen hover:cursor-pointer"
          >
            <IoMdAddCircle aria-hidden="true" />
          </button>
        </Tooltip>
      )}

      <CopyModal
        disclosure={createDisclosure}
        organizationId={organizationId}
      ></CopyModal>
    </div>
  );
}
