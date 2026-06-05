"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useMemo, useState } from "react";
import CollectionCard from "../collection/collection-card";
import { Button, Link, Modal } from "@heroui/react";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { SimpleSelect, SimpleSelectItem } from "@/components/ui/simple-select";
import { useDisclosure } from "@/utilities/useDisclosure";
import { GrAttachment } from "react-icons/gr";
import usePermissions from "@/utilities/swr/usePermissions";
import { useLegacyUrls } from "./legacy-urls-context";
import ConventionModal from "./convention-modal";
import { FaEdit, FaRegIdBadge, FaTrophy, FaUsersCog } from "react-icons/fa";
import { IoMdAddCircle } from "react-icons/io";
import CollectionModal from "../collection/collection-modal";
import { TbPackageImport } from "react-icons/tb";
import { DateFormatter } from "@internationalized/date";
import {
  MdAdminPanelSettings,
  MdOutlineShoppingCartCheckout,
} from "react-icons/md";
import { CollectionWithCount, ConventionWithCollections } from "@/types/models";

interface ConventionInfoProps {
  id: number;
  hideTitle?: boolean;
  hideSubtitle?: boolean;
}

export default function ConventionInfo(props: ConventionInfoProps) {
  const { id, hideTitle, hideSubtitle } = props;

  const [convention, setData] = useState<ConventionWithCollections | null>(
    null,
  );
  const [isLoading, setLoading] = useState(true);
  const [collectionIdToAttach, setCollectionIdToAttach] = useState<
    number | null
  >(null);
  const [collections, setCollections] = useState<CollectionWithCount[] | null>(
    null,
  );
  const [filteredCollections, setFilteredCollections] = useState<
    CollectionWithCount[] | null
  >(null);
  const [readOnly, setReadOnly] = useState(true);

  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();
  const legacyUrls = useLegacyUrls();
  const formatter = useMemo(
    () =>
      new DateFormatter("en-US", {
        dateStyle: "full",
        timeStyle: "full",
        timeZone: "America/Chicago",
      }),
    [],
  );

  useEffect(() => {
    frontendFetch("GET", "/con/" + id, null, session?.data?.token)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {});
  }, [id, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (convention) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == convention.organizationId && d.admin === true,
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          if (
            (permissions.conventions.data?.filter(
              (d) => d.conventionId == convention.id && d.admin === true,
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
  }, [
    permissions.user?.data,
    permissions.organizations?.data,
    permissions.conventions?.data,
    convention,
  ]);

  useEffect(() => {
    if (convention && !readOnly) {
      frontendFetch(
        "GET",
        "/org/" + convention.organizationId + "/collections",
        null,
        session?.data?.token,
      )
        .then((res) => res.json())
        .then((data) => {
          setCollections(data);
        })
        .catch(() => {});
    }
  }, [convention, session?.data?.token, readOnly]);

  useEffect(() => {
    if (collections) {
      setFilteredCollections(
        collections?.filter(
          (c) =>
            convention?.collections.find((c2) => c2.collectionId == c.id) ===
            undefined,
        ),
      );
    }
  }, [collections, convention]);

  const onModalClose = () => {
    frontendFetch("GET", "/con/" + id, null, session?.data?.token)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
      })
      .catch(() => {});
  };

  const onSave = () => {
    frontendFetch(
      "POST",
      "/con/" + id + "/conventionCollection/" + collectionIdToAttach,
      {},
      session?.data?.token,
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
    <div className="relative flex flex-col sm:flex-row m-5">
      <div className="flex-1">
        <div className="text-gwgreen" hidden={hideTitle && hideSubtitle}>
          <h1 hidden={hideTitle}>{convention.name}</h1>
          <h2 className="mb-8" hidden={hideSubtitle}>
            {convention.theme}
          </h2>
        </div>

        <div className="flex gap-2 mb-8 items-center">
          <div>
            {readOnly ? (
              null
            ) : (
              <div className="flex gap-2 items-center">
                <div className="flex gap-2 items-center">
                  <SimpleTooltip
                    content={"Edit " + convention.name}
                    delay={1000}
                    classNames={{
                      content: "max-w-[125px] text-center",
                    }}
                    ariaLabel={"Edit " + convention.name}
                    triggerClassName="text-3xl inline-flex items-center hover:cursor-pointer"
                    onPress={onOpenEdit}
                  >
                    <FaEdit
                      aria-hidden="true"
                      className="h-8 w-auto text-white hover:text-gwgreen"
                    />
                  </SimpleTooltip>

                  <SimpleTooltip
                    content={"Attendees"}
                    showArrow={true}
                    color="success"
                    delay={1000}
                    classNames={{
                      content: "max-w-[125px] text-center",
                    }}
                  >
                    <span className="text-3xl inline-flex items-center hover:cursor-pointer">
                      <Link
                        aria-label="Attendees"
                        className="text-white hover:text-gwgreen"
                        href={`/dashboard/organization/${String(convention.organizationId)}/convention/${String(convention.id)}/attendees`}
                      >
                        <FaRegIdBadge
                          aria-hidden="true"
                          className="h-8 w-auto"
                        />
                      </Link>
                    </span>
                  </SimpleTooltip>

                  <SimpleTooltip
                    content={"User Permissions"}
                    showArrow={true}
                    color="success"
                    delay={1000}
                    classNames={{
                      content: "max-w-[125px] text-center",
                    }}
                  >
                    <span className="text-3xl inline-flex items-center hover:cursor-pointer">
                      <Link
                        aria-label="User Permissions"
                        className="text-white hover:text-gwgreen"
                        href={`/dashboard/organization/${String(convention.organizationId)}/convention/${String(convention.id)}/users`}
                      >
                        <FaUsersCog aria-hidden="true" className="h-8 w-auto" />
                      </Link>
                    </span>
                  </SimpleTooltip>

                  <div className="border-r border-gwblue mr-2 ml-2 self-stretch"></div>
                </div>
              </div>
            )}
          </div>

          {readOnly ? (
            null
          ) : (
            <SimpleTooltip
              content={"Legacy Board Game Admin Frontend"}
              showArrow={true}
              color="success"
              delay={1000}
              classNames={{
                content: "max-w-[125px] text-center",
              }}
            >
              <span className="text-3xl inline-flex items-center hover:cursor-pointer">
                <Link
                  target="_blank"
                  aria-label="Legacy Board Game Admin Frontend (opens in new tab)"
                  className="text-white hover:text-gwgreen"
                  href={`${legacyUrls.adminUrl}/org/${String(convention.organizationId)}/con/${String(convention.id)}`}
                >
                  <MdAdminPanelSettings
                    aria-hidden="true"
                    className="h-8 w-auto"
                  />
                </Link>
              </span>
            </SimpleTooltip>
          )}

          <SimpleTooltip
            content={"Legacy Librarian Frontend"}
            showArrow={true}
            color="success"
            delay={1000}
            classNames={{
              content: "max-w-[125px] text-center",
            }}
          >
            <span className="text-3xl inline-flex items-center hover:cursor-pointer">
              <Link
                target="_blank"
                aria-label="Legacy Librarian Frontend (opens in new tab)"
                className="text-white hover:text-gwgreen"
                href={`${legacyUrls.librarianUrl}/org/${String(convention.organizationId)}/con/${String(convention.id)}`}
              >
                <MdOutlineShoppingCartCheckout
                  aria-hidden="true"
                  className="h-8 w-auto"
                />
              </Link>
            </span>
          </SimpleTooltip>

          <SimpleTooltip
            content={"Legacy Play Prize Entry Frontend"}
            showArrow={true}
            color="success"
            delay={1000}
            classNames={{
              content: "max-w-[125px] text-center",
            }}
          >
            <span className="text-3xl inline-flex items-center hover:cursor-pointer">
              <Link
                target="_blank"
                aria-label="Legacy Play Prize Entry Frontend (opens in new tab)"
                className="text-white hover:text-gwgreen"
                href={`${legacyUrls.playPrizeEntryUrl}/org/${String(convention.organizationId)}/con/${String(convention.id)}`}
              >
                <FaTrophy aria-hidden="true" className="h-8 w-auto" />
              </Link>
            </span>
          </SimpleTooltip>
        </div>

        <p>
          <b className="text-gwlightblue">Start Date: </b>
          {formatter.format(new Date(convention.startDate))}
        </p>
        <p className="mb-8">
          <b className="text-gwlightblue">End Date: </b>
          {formatter.format(new Date(convention.endDate))}
        </p>

        <h3 className="flex">
          <span className="text-gwlightblue">
            <b>Collections:</b>
          </span>{" "}
          {readOnly ? (
            null
          ) : (
            <div className="flex">
              <SimpleTooltip
                content="Create Collection"
                delay={1000}
                ariaLabel="Create Collection"
                triggerClassName="ml-2 hover:cursor-pointer hover:text-gwgreen"
                onPress={onOpenCreate}
              >
                <IoMdAddCircle aria-hidden="true" />
              </SimpleTooltip>
              <SimpleTooltip
                content="Import Collection"
                delay={1000}
                ariaLabel="Import Collection"
                triggerClassName="ml-2 hover:cursor-pointer hover:text-gwgreen"
                onPress={onOpenImport}
              >
                <TbPackageImport aria-hidden="true" />
              </SimpleTooltip>
              <SimpleTooltip
                content="Attach Collection"
                delay={1000}
                ariaLabel="Attach Collection"
                triggerClassName="ml-2 hover:cursor-pointer hover:text-gwgreen"
                onPress={onOpen}
              >
                <GrAttachment aria-hidden="true" />
              </SimpleTooltip>
            </div>
          )}
        </h3>
        {readOnly || !isOpen ? (
          null
        ) : (
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
                    <Modal.Header>
                      <Modal.Heading>Attach Collection</Modal.Heading>
                    </Modal.Header>
                    <Modal.Body>
                      <SimpleSelect
                        name="collectionSelect"
                        label="Collection to Attach"
                        placeholder="Select a collection"
                        onSelectionChange={(key) => {
                          setCollectionIdToAttach(
                            key != null ? Number(key) : null
                          );
                        }}
                      >
                        {(filteredCollections ?? []).map((collection) => (
                          <SimpleSelectItem
                            key={collection.id}
                            id={String(collection.id)}
                            textValue={collection.name}
                          />
                        ))}
                      </SimpleSelect>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button variant="primary" type="submit">
                        Attach
                      </Button>
                      <Button variant="secondary" onPress={onClose}>
                        Cancel
                      </Button>
                    </Modal.Footer>
                  </form>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        )}
        <div className="flex flex-wrap mr-8">
          {convention.collections.map((c) => {
            return (
              <div key={c.collection.id}>
                <CollectionCard
                  collectionIn={c.collection}
                  conventionId={convention.id}
                  onDeleted={onClose}
                  readOnly={readOnly}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Only render modals while open. ConventionInfo lives inside an Accordion
          panel, which keeps collapsed content in the DOM but display:none — and a
          modal's (DialogTrigger) hidden trigger can't be focusable while hidden,
          which spams react-aria warnings. Gating on isOpen means closed/collapsed
          panels render no modal at all. */}
      {isOpenEdit && (
        <ConventionModal
          conventionIn={convention}
          conventionId={id}
          organizationId={convention.organizationId}
          disclosure={editDisclosure}
        />
      )}
      {isOpenCreate && (
        <CollectionModal
          disclosure={createCollectionDisclosure}
          conventionId={convention.id}
          organizationId={convention.organizationId}
        />
      )}
      {isOpenImport && (
        <CollectionModal
          disclosure={importCollectionDisclosure}
          conventionId={convention.id}
          organizationId={convention.organizationId}
          importFile={true}
        />
      )}
    </div>
  );
}
