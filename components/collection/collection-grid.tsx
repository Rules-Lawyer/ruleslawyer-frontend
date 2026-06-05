"use client";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useDisclosure } from "@/utilities/useDisclosure";
import React, { useEffect, useState } from "react";
import { IoMdAddCircle } from "react-icons/io";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import CollectionCard from "./collection-card";
import CollectionModal from "./collection-modal";
import { TbPackageImport } from "react-icons/tb";
import usePermissions from "@/utilities/swr/usePermissions";
import { CollectionWithCount } from "@/types/models";

interface CollectionGridProps {
  collectionsIn?: CollectionWithCount[];
  organizationId?: number;
}

export default function CollectionGrid(props: CollectionGridProps) {
  const { collectionsIn, organizationId } = props;

  const [collections, setData] = useState<CollectionWithCount[] | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

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
    if (collectionsIn) {
      setData(collectionsIn);
      setLoading(false);
    } else {
      frontendFetch(
        "GET",
        "/org/" + organizationId + "/collections",
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
  }, [collectionsIn, organizationId, session?.data?.token]);

  const onModalClose = () => {
    frontendFetch(
      "GET",
      "/org/" + organizationId + "/collections",
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

  const createDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const {
    isOpen: isOpenCreate,
    onOpen: onOpenCreate,
    onClose: onCloseCreate,
  } = createDisclosure;

  const importDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const {
    isOpen: isOpenImport,
    onOpen: onOpenImport,
    onClose: onCloseImport,
  } = importDisclosure;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-wrap">
        {collections?.map(
          (c) => {
            return (
              <CollectionCard
                key={c.id}
                collectionIn={c}
                onDeleted={onModalClose}
              />
            );
          }
        )}
      </div>

      {readOnly ? (
        null
      ) : (
        <SimpleTooltip
          content="Import Collection"
          delay={1000}
          ariaLabel="Import Collection"
          triggerClassName="text-7xl fixed bottom-28 right-8 hover:text-gwgreen hover:cursor-pointer"
          onPress={onOpenImport}
        >
          <TbPackageImport aria-hidden="true" />
        </SimpleTooltip>
      )}

      {readOnly ? (
        null
      ) : (
        <SimpleTooltip
          content="Create Collection"
          delay={1000}
          ariaLabel="Create Collection"
          triggerClassName="text-7xl fixed bottom-8 right-8 hover:text-gwgreen hover:cursor-pointer"
          onPress={onOpenCreate}
        >
          <IoMdAddCircle aria-hidden="true" />
        </SimpleTooltip>
      )}

      <CollectionModal
        disclosure={createDisclosure}
        organizationId={organizationId}
      ></CollectionModal>

      <CollectionModal
        disclosure={importDisclosure}
        organizationId={organizationId}
        importFile={true}
      ></CollectionModal>
    </div>
  );
}
