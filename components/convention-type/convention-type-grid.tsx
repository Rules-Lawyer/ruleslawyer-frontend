"use client";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useDisclosure } from "@/utilities/useDisclosure";
import React, { useEffect, useState } from "react";
import { IoMdAddCircle } from "react-icons/io";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import usePermissions from "@/utilities/swr/usePermissions";
import ConventionTypeCard from "./convention-type-card";
import { ConventionType } from "@/types/models";
import ConventionTypeModal from "./convention-type-modal";

interface ConventionTypeGridProps {
  organizationId?: number;
}

export default function ConventionTypeGrid(props: ConventionTypeGridProps) {
  const { organizationId } = props;

  const [ conventionTypes, setConventionTypes] = useState<ConventionType[] | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
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
    if (organizationId && session?.data?.token) {
      frontendFetch(
        "GET",
        "/org/" + organizationId + "/conventionTypes",
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setConventionTypes(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {});
    }
  }, [organizationId, session?.data?.token]);

  const onModalClose = () => {
    frontendFetch(
      "GET",
      "/org/" + organizationId + "/conventionTypes",
      null,
      session?.data?.token
    )
      .then((res) => res.json())
      .then((data) => {
        setConventionTypes(Array.isArray(data) ? data : []);
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
        {conventionTypes ? conventionTypes
          ?.slice()
          .sort((ct1, ct2) =>
            (ct1.name ?? "").localeCompare(ct2.name ?? "")
          )
          .map(
            (ct) => {
              return (
                <ConventionTypeCard
                  key={ct.id}
                  conventionTypeIn={ct}
                  onUpdated={(updated) =>
                    setConventionTypes((prev) =>
                      prev
                        ? prev.map((c) =>
                            c.id === ct.id ? { ...c, ...updated } : c
                          )
                        : prev
                    )
                  }
                />
              );
            }
          )
          : null
        }
      </div>

      {readOnly ? (
        null
      ) : (
        <SimpleTooltip
          content="Add Convention Type"
          delay={1000}
          ariaLabel="Add Convention Type"
          triggerClassName="text-7xl fixed bottom-8 right-8 hover:text-gwgreen hover:cursor-pointer"
          onPress={onOpenCreate}
        >
          <IoMdAddCircle aria-hidden="true" />
        </SimpleTooltip>
      )}

      <ConventionTypeModal
        disclosure={createDisclosure}
        organizationId={Number(organizationId)}
      ></ConventionTypeModal>
    </div>
  );
}
