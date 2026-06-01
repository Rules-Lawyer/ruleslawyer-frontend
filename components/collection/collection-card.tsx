"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import {
  toastDeleteError,
  toastDeleteNetworkError,
  toastDetachError,
  toastDetachNetworkError,
} from "@/utilities/toastFetchError";
import { Skeleton, Tooltip, useDisclosure } from "@heroui/react";
import { BiSolidMessageAltError } from "react-icons/bi";
import { IoLibrary } from "react-icons/io5";
import { GrDetach } from "react-icons/gr";
import usePermissions from "@/utilities/swr/usePermissions";
import { FaEdit, FaLock } from "react-icons/fa";
import CollectionModal from "./collection-modal";
import { FaTrashCan, FaTrophy } from "react-icons/fa6";
import Link from "next/link";
import { CollectionWithCount } from "@/types/models";

interface CollectionCardProps {
  collectionIn: CollectionWithCount;
  conventionId?: number;
  onDeleted: () => void;
}

export default function CollectionCard(props: CollectionCardProps) {
  const { collectionIn, conventionId, onDeleted } = props;

  const [collection, setData] = useState<CollectionWithCount | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  useEffect(() => {
    if (collectionIn) {
      setData(collectionIn);
      setLoading(false);
    } else {
      // Dead branch: collectionIn is always provided by callers. Kept as-is.
      frontendFetch(
        "GET",
        "/collection/" + (collectionIn as CollectionWithCount).id,
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
  }, [collectionIn, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (collection) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == collection.organizationId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          if (
            permissions.conventions.data?.filter(
              (d) =>
                collection?.conventions?.some(
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
  }, [permissions.user?.data, permissions.organizations?.data, permissions.conventions?.data, collection]);

  const onModalClose = () => {
    frontendFetch(
      "GET",
      "/collection/" + collection?.id,
      null,
      session?.data?.token
    )
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {});
  };

  const disclosure = useDisclosure({
    onClose: onModalClose,
  });

  const { isOpen: isOpen, onOpen: onOpen, onClose: onClose } = disclosure;

  const detachCollection = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    collectionId: number
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (confirm("Are you sure you want to detach this collection?")) {
      frontendFetch(
        "DELETE",
        "/con/" + conventionId + "/conventionCollection/" + collectionId,
        {},
        session?.data?.token
      )
        .then((res) => {
          if (!res.ok) {
            toastDetachError(res);
            return;
          }
          onDeleted();
        })
        .catch(() => {
          toastDetachNetworkError();
        });
    }
  };

  const deleteCollection = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    collectionId: number
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (confirm("Are you sure you want to delete this collection?")) {
      frontendFetch(
        "DELETE",
        "/collection/" + collectionId,
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

  if (!collection) {
    return (
      <div className="flex items-center border-2 w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] border-slate-800">
        <div className="flex-col p-3 w-24">
          <BiSolidMessageAltError size={64} className="text-slate-500" />
        </div>
        <div className="flex-col pr-3 w-full">
          <div className="inline-block align-middle h-full">
            <span className="inline-block align-middle h-full">
              Error loading collection
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      className="relative"
      href={
        readOnly
          ? "/dashboard/collection/" + collection.id
          : "/dashboard/organization/" +
            collection.organizationId +
            "/collection/" +
            collection.id
      }
    >
      <div className="flex items-center border-2 border-gwblue w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] cursor-pointer">
        <div className="flex-col p-3 w-24">
          <IoLibrary size={64} />
        </div>
        <div className="flex-col pr-3 w-40">
          <span className="inline-block align-middle h-full">
            <p>
              {collection.name !== ""
                ? collection.name
                : "[unknown collection]"}
            </p>
            <p>Copies: {collection._count.copies}</p>
          </span>
        </div>
        {conventionId && !readOnly ? (
          <div className="absolute bottom-5 right-10">
            {" "}
            <Tooltip
              content={"Detach " + collection.name}
              showArrow={true}
              color="success"
              delay={1000}
            >
              <button
                type="button"
                aria-label={"Detach " + collection.name}
                className="hover:text-gwlightblue hover:cursor-pointer"
                onClick={(e) => detachCollection(e, collection.id)}
              >
                <GrDetach aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        ) : (
          ""
        )}
        {!readOnly && !collection.archived ? (
          <div className="absolute top-5 right-10">
            <Tooltip
              content={"Edit " + collection.name}
              showArrow={true}
              color="success"
              delay={1000}
            >
              <button
                type="button"
                aria-label={"Edit " + collection.name}
                className="hover:text-gwgreen hover:cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpen();
                }}
              >
                <FaEdit aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        ) : (
          ""
        )}
        {collection.archived ? (
          <div className="absolute top-5 right-10 text-gwdarkred">
            <Tooltip
              content={"Archived collection"}
              showArrow={true}
              color="success"
              delay={1000}
            >
              <span>
                <FaLock role="img" aria-label="Archived collection" />
              </span>
            </Tooltip>
          </div>
        ) : (
          ""
        )}
        {collection.allowWinning ? (
          <div className="absolute top-10 right-10 text-gwgreen">
            <Tooltip
              content={"Allows winning copies"}
              showArrow={true}
              color="success"
              delay={1000}
            >
              <span>
                <FaTrophy role="img" aria-label="Allows winning copies" />
              </span>
            </Tooltip>
          </div>
        ) : (
          ""
        )}
        {!readOnly &&
        collection._count.copies === 0 &&
        collection._count.conventions === 0 ? (
          <div className="absolute top-15 right-10">
            {" "}
            <Tooltip
              content={"Delete " + collection.name}
              showArrow={true}
              color="success"
              delay={1000}
            >
              <button
                type="button"
                aria-label={"Delete " + collection.name}
                className="hover:text-gwgreen hover:cursor-pointer"
                onClick={(e) => deleteCollection(e, collection.id)}
              >
                <FaTrashCan aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        ) : (
          ""
        )}
      </div>
      <CollectionModal
        collectionIn={collection}
        organizationId={collection.organizationId}
        disclosure={disclosure}
      />
    </Link>
  );
}
