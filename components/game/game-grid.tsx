"use client";
import React, { useEffect, useState } from "react";
import GameCard from "./game-card";
import {
  Spinner,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { SimpleSelect, SimpleSelectItem } from "@/components/ui/simple-select";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useDisclosure } from "@/utilities/useDisclosure";
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
        <Spinner aria-label="Loading..." />
      </div>
    );
  }

  return (
    <div>
      {showHeader ? <h1>{header}</h1> : ""}
      <div className="flex m-10">
        <TextField
          name="search"
          aria-label="Search Games"
          onChange={setSearchText}
          className="mr-10 w-2/3"
        >
          <Label>Search Games</Label>
          <Input className={"bg-gwdarkgreen"} placeholder="Type a game name" />
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
          <SimpleSelectItem id="50" textValue="50 Games" />
          <SimpleSelectItem id="100" textValue="100 Games" />
          <SimpleSelectItem id="500" textValue="500 Games" />
        </SimpleSelect>
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
        <SimpleTooltip
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
        </SimpleTooltip>
      )}

      <CopyModal
        disclosure={createDisclosure}
        organizationId={organizationId}
      ></CopyModal>
    </div>
  );
}
