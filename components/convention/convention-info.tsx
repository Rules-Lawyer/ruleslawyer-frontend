"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import CollectionCard from "../collection/collection-card";
import {
  Button,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { GrAttachment } from "react-icons/gr";
import usePermissions from "@/utilities/swr/usePermissions";
import { useLegacyUrls } from "./legacy-urls-context";
import ConventionModal from "./convention-modal";
import { FaEdit, FaRegIdBadge, FaTrophy, FaUsersCog } from "react-icons/fa";
import { IoMdAddCircle } from "react-icons/io";
import CollectionModal from "../collection/collection-modal";
import { TbPackageImport } from "react-icons/tb";
import { DateFormatter } from "@internationalized/date";
import { MdAdminPanelSettings, MdOutlineShoppingCartCheckout } from "react-icons/md";
import {
  CollectionWithCount,
  ConventionWithCollections,
} from "@/types/models";

interface ConventionInfoProps {
  id: number;
  hideTitle?: boolean;
  hideSubtitle?: boolean;
}

export default function ConventionInfo(props: ConventionInfoProps) {
  const { id, hideTitle, hideSubtitle } = props;

  const [convention, setData] = useState<ConventionWithCollections | null>(
    null
  );
  const [isLoading, setLoading] = useState(true);
  const [collectionIdToAttach, setCollectionIdToAttach] = useState<
    number | null
  >(null);
  const [collections, setCollections] = useState<CollectionWithCount[] | null>(
    null
  );
  const [filteredCollections, setFilteredCollections] = useState<
    CollectionWithCount[] | null
  >(null);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();
  const legacyUrls = useLegacyUrls();
  const formatter = new DateFormatter("en-US", {
    dateStyle: "full",
    timeStyle: "full",
    timeZone: "America/Chicago",
  });

  useEffect(() => {
    frontendFetch("GET", "/con/" + id, null, session?.data?.token)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {});
  }, [id, session?.data?.token]);

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
            (permissions.conventions.data?.filter(
              (d) => d.conventionId == convention.id && d.admin === true
            ).length ?? 0) > 0
          ) {
            setReadOnly(false);
          } else {
            setReadOnly(true);
          }

          setLoading(false);
        }

        setLoading(false);
      } else {
        setReadOnly(true);
      }
    } else {
      setReadOnly(true);
    }
  }, [permissions.user?.data, permissions.organizations?.data, permissions.conventions?.data, convention]);

  useEffect(() => {
    if (convention && !readOnly) {
      frontendFetch(
        "GET",
        "/org/" + convention.organizationId + "/collections",
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setCollections(data);
        })
        .catch((err) => {});
    }
  }, [convention, session?.data?.token, readOnly]);

  useEffect(() => {
    if (collections) {
      setFilteredCollections(
        collections?.filter(
          (c) =>
            convention?.collections.find(
              (c2) => c2.collectionId == c.id
            ) === undefined
        )
      );
    }
  }, [collections, convention]);

  const onModalClose = () => {
    frontendFetch("GET", "/con/" + id, null, session?.data?.token)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
      })
      .catch((err) => {});
  };

  const onSave = () => {
    frontendFetch(
      "POST",
      "/con/" + id + "/conventionCollection/" + collectionIdToAttach,
      {},
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
  };

  const disclosure = useDisclosure({
    onClose: onModalClose,
  });
  const { isOpen, onOpen, onClose } = disclosure;

  const createCollectionDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const {
    isOpen: isOpenCreate,
    onOpen: onOpenCreate,
    onClose: onCloseCreate,
  } = createCollectionDisclosure;

  const importCollectionDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const {
    isOpen: isOpenImport,
    onOpen: onOpenImport,
    onClose: onCloseImport,
  } = importCollectionDisclosure;

  const editDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const {
    isOpen: isOpenEdit,
    onOpen: onOpenEdit,
    onClose: onCloseEdit,
  } = editDisclosure;

  if (isLoading || isLoadingPermissions) return <div>Loading...</div>;
  if (!convention) return <div>Loading...</div>;

  return (
    <div className="relative flex flex-col sm:flex-row">
      <div className="flex-1">
          <div className="text-gwgreen" hidden={hideTitle && hideSubtitle}>
            <h1 hidden={hideTitle}>{convention.name}</h1>
            <h2 className="mb-8" hidden={hideSubtitle}>
              {convention.theme}
            </h2>
          </div>

        <div className="flex gap-2 mb-8 items-center">
          <div>
            <div className="flex gap-2 items-center">
              {readOnly ? (
                ""
              ) : (
                <Tooltip
                  content={"Edit " + convention.name}
                  showArrow={true}
                  color="success"
                  delay={1000}
                  classNames={{
                    content: "max-w-[125px] text-center"
                  }}
                >
                  <button
                    type="button"
                    onClick={onOpenEdit}
                    aria-label={"Edit " + convention.name}
                    className="text-3xl inline-flex items-center hover:cursor-pointer"
                  >
                    <FaEdit aria-hidden="true" className="h-8 w-auto text-white hover:text-gwgreen" />
                  </button>
                </Tooltip>
              )}

              <Tooltip
                content={"Attendees"}
                showArrow={true}
                color="success"
                delay={1000}
                classNames={{
                  content: "max-w-[125px] text-center"
                }}
              >
                <span className="text-3xl inline-flex items-center hover:cursor-pointer">
                  <Link aria-label="Attendees" className="text-white hover:text-gwgreen" href={`/dashboard/organization/${String(convention.organizationId)}/convention/${String(convention.id)}/attendees`}><FaRegIdBadge aria-hidden="true" className="h-8 w-auto" /></Link>
                </span>
              </Tooltip>

              <Tooltip
                content={"User Permissions"}
                showArrow={true}
                color="success"
                delay={1000}
                classNames={{
                  content: "max-w-[125px] text-center"
                }}
              >
                <span className="text-3xl inline-flex items-center hover:cursor-pointer">
                  <Link aria-label="User Permissions" className="text-white hover:text-gwgreen" href={`/dashboard/organization/${String(convention.organizationId)}/convention/${String(convention.id)}/users`}><FaUsersCog aria-hidden="true" className="h-8 w-auto" /></Link>
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="border-r border-gwblue mr-2 ml-2 self-stretch"></div>

          <Tooltip
            content={"Legacy Board Game Admin Frontend"}
            showArrow={true}
            color="success"
            delay={1000}
            classNames={{
              content: "max-w-[125px] text-center"
            }}
          >
            <span className="text-3xl inline-flex items-center hover:cursor-pointer">
              <Link target="_blank" aria-label="Legacy Board Game Admin Frontend (opens in new tab)" className="text-white hover:text-gwgreen" href={`${legacyUrls.adminUrl}/org/${String(convention.organizationId)}/con/${String(convention.id)}`}><MdAdminPanelSettings aria-hidden="true" className="h-8 w-auto" /></Link>
            </span>
          </Tooltip>

          <Tooltip
            content={"Legacy Librarian Frontend"}
            showArrow={true}
            color="success"
            delay={1000}
            classNames={{
              content: "max-w-[125px] text-center"
            }}
          >
            <span className="text-3xl inline-flex items-center hover:cursor-pointer">
              <Link target="_blank" aria-label="Legacy Librarian Frontend (opens in new tab)" className="text-white hover:text-gwgreen" href={`${legacyUrls.librarianUrl}/org/${String(convention.organizationId)}/con/${String(convention.id)}`}><MdOutlineShoppingCartCheckout aria-hidden="true" className="h-8 w-auto" /></Link>
            </span>
          </Tooltip>

          <Tooltip
            content={"Legacy Play Prize Entry Frontend"}
            showArrow={true}
            color="success"
            delay={1000}
            classNames={{
              content: "max-w-[125px] text-center"
            }}
          >
            <span className="text-3xl inline-flex items-center hover:cursor-pointer">
              <Link target="_blank" aria-label="Legacy Play Prize Entry Frontend (opens in new tab)" className="text-white hover:text-gwgreen" href={`${legacyUrls.playPrizeEntryUrl}/org/${String(convention.organizationId)}/con/${String(convention.id)}`}><FaTrophy aria-hidden="true" className="h-8 w-auto" /></Link>
            </span>
          </Tooltip>
        </div>

          <p>
            <b className="text-gwgreen">Start Date: </b>
            {formatter.format(new Date(convention.startDate))}
          </p>
          <p className="mb-8">
            <b className="text-gwgreen">End Date: </b>
            {formatter.format(new Date(convention.endDate))}
          </p>

        <h3 className="flex">
          <span className="text-gwgreen">
            <b>Collections:</b>
          </span>{" "}
          {readOnly ? (
            ""
          ) : (
            <div className="flex">
              <Tooltip
                content="Create Collection"
                showArrow={true}
                color="success"
                delay={1000}
              >
                <button
                  type="button"
                  aria-label="Create Collection"
                  onClick={onOpenCreate}
                  className="ml-2 hover:cursor-pointer hover:text-gwgreen"
                >
                  <IoMdAddCircle aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip
                content="Import Collection"
                showArrow={true}
                color="success"
                delay={1000}
              >
                <button
                  type="button"
                  aria-label="Import Collection"
                  onClick={onOpenImport}
                  className="ml-2 hover:cursor-pointer hover:text-gwgreen"
                >
                  <TbPackageImport aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip
                content="Attach Collection"
                showArrow={true}
                color="success"
                delay={1000}
              >
                <button
                  type="button"
                  aria-label="Attach Collection"
                  onClick={onOpen}
                  className="ml-2 hover:cursor-pointer hover:text-gwgreen"
                >
                  <GrAttachment aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          )}
        </h3>
        {readOnly ? (
          ""
        ) : (
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSave();
                }}
              >
                <ModalHeader>Attach Collection</ModalHeader>
                <ModalBody>
                  <Select
                    name="collectionSelect"
                    items={filteredCollections ?? []}
                    label="Collection to Attach"
                    placeholder="Select a collection"
                    isRequired
                    onChange={(event) => {
                      setCollectionIdToAttach(Number(event.target.value));
                    }}
                  >
                    {(collection) => (
                      <SelectItem key={collection.id}>
                        {collection.name}
                      </SelectItem>
                    )}
                  </Select>
                </ModalBody>
                <ModalFooter>
                  <Button color="success" type="submit">
                    Attach
                  </Button>
                  <Button color="primary" onPress={onClose}>
                    Cancel
                  </Button>
                </ModalFooter>
              </form>
            </ModalContent>
          </Modal>
        )}
        <div className="flex flex-wrap mr-8">
          {convention.collections.map(
            (c) => {
              return (
                <div key={c.collection.id}>
                  <CollectionCard
                    collectionIn={c.collection}
                    conventionId={convention.id}
                    onDeleted={onClose}
                  />
                </div>
              );
            }
          )}
        </div>
      </div>

      <ConventionModal
        conventionIn={convention}
        conventionId={id}
        organizationId={convention.organizationId}
        disclosure={editDisclosure}
      />
      <CollectionModal
        disclosure={createCollectionDisclosure}
        conventionId={convention.id}
        organizationId={convention.organizationId}
      />
      <CollectionModal
        disclosure={importCollectionDisclosure}
        conventionId={convention.id}
        organizationId={convention.organizationId}
        importFile={true}
      />
    </div>
  );
}
