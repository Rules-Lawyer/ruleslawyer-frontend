"use client";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useDisclosure } from "@/utilities/useDisclosure";
import React, { useEffect, useState } from "react";
import { IoMdAddCircle } from "react-icons/io";
import CollectionCard from "./collection-card";
import CollectionModal from "./collection-modal";
import { TbPackageImport } from "react-icons/tb";
import usePermissions from "@/utilities/swr/usePermissions";
import { useOrgCollections } from "@/utilities/swr/useOrgCollections";
import { CollectionWithCount } from "@/types/models";

interface CollectionGridProps {
  collectionsIn?: CollectionWithCount[];
  organizationId?: number;
}

export default function CollectionGrid(props: CollectionGridProps) {
  const { collectionsIn, organizationId } = props;

  const { collections, isLoading, mutate } = useOrgCollections(
    organizationId,
    collectionsIn
  );
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

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
    // Keep the grid in sync when the parent hands down a fresh list without
    // firing a request — the prop stays the source of truth when provided.
    if (collectionsIn !== undefined) {
      mutate(collectionsIn, { revalidate: false });
    }
  }, [collectionsIn, mutate]);

  const onModalClose = () => {
    mutate();
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

      {/* Only mount modals while open — avoids needless mounts (incl. for
          read-only viewers) and the react-aria hidden-trigger warnings. */}
      {isOpenCreate && (
        <CollectionModal
          disclosure={createDisclosure}
          organizationId={organizationId}
        />
      )}

      {isOpenImport && (
        <CollectionModal
          disclosure={importDisclosure}
          organizationId={organizationId}
          importFile={true}
        />
      )}
    </div>
  );
}
