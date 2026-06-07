"use client";
import { Accordion, Selection } from "@heroui/react";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useDisclosure } from "@/utilities/useDisclosure";
import React, { useEffect, useState } from "react";
import ConventionInfo from "./convention-info";
import { IoMdAddCircle } from "react-icons/io";
import ConventionModal from "./convention-modal";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import usePermissions from "@/utilities/swr/usePermissions";
import { preloadConvention } from "@/utilities/swr/useConvention";
import { Convention } from "@/types/models";

interface ConventionListProps {
  conventionsIn?: Convention[];
  organizationId?: number;
}

export default function ConventionList(props: ConventionListProps) {
  const { conventionsIn, organizationId } = props;

  const [conventions, setData] = useState<Convention[] | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [activeConvention, setActiveConvention] = useState<
    Convention | undefined
  >(undefined);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([""]));
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (organizationId) {
        if (
          (permissions.organizations.data?.filter(
            (d) => d.organizationId == organizationId && d.admin === true
          ).length ?? 0) > 0
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
    if (conventionsIn) {
      setData(conventionsIn);
      setLoading(false);
    } else if (organizationId) {
      frontendFetch(
        "GET",
        "/org/" + organizationId + "/conventions",
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {});
    } else {
      frontendFetch("GET", "/con", null, session?.data?.token)
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {});
    }
  }, [conventionsIn, organizationId, session?.data?.token]);

  useEffect(() => {
    if (activeConvention === undefined) {
      //Is a convention currently running? Make it active
      let active = conventions?.find(
        (c) =>
          Date.parse(c.startDate) < Date.now() &&
          Date.parse(c.endDate) > Date.now()
      );

      if (active) {
        setActiveConvention(active);
        setSelectedKeys(new Set([String(active.id)]));
      }

      //If we didn't get an active convention, get the next convention and make it active
      if (!active) {
        active = conventions?.findLast(
          (c) => Date.parse(c.startDate) > Date.now()
        );

        if (active) {
          setActiveConvention(active);
          setSelectedKeys(new Set([String(active.id)]));
        }
      }
    }
  }, [conventions, activeConvention]);

  const onModalClose = () => {
    frontendFetch(
      "GET",
      "/org/" + organizationId + "/conventions",
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

  const importDisclosure = useDisclosure({
    onClose: onModalClose,
  });

  const {
    isOpen: isOpenCreate,
    onOpen: onOpenCreate,
    onClose: onCloseCreate,
  } = createDisclosure;

  return (
    <div>
      <Accordion
        allowsMultipleExpanded
        expandedKeys={selectedKeys}
        onExpandedChange={setSelectedKeys}
      >
        {(conventions ?? []).filter((c) => c != null).map(
          (c) => {
            return (
              <Accordion.Item key={c.id} id={String(c.id)}>
                <Accordion.Heading>
                  <Accordion.Trigger
                    className={"hover:bg-gwdarkgreen "}
                    onHoverStart={() =>
                      preloadConvention(c.id, session?.data?.token)
                    }
                    onFocus={() =>
                      preloadConvention(c.id, session?.data?.token)
                    }
                  >
                    <span className="data-[open=true]:text-gwgreen mr-5">
                      {c.name}
                    </span>
                    <span className="text-gwlightblue">{c.theme}</span>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  {/* Render the (heavy, modal/tooltip-laden) ConventionInfo only
                      while expanded. Accordion panels keep collapsed content in
                      the DOM but display:none, where react-aria triggers can't be
                      focusable and spam warnings — and it's wasteful. */}
                  {(selectedKeys === "all" ||
                    selectedKeys.has(String(c.id))) && (
                    <ConventionInfo
                      id={c.id}
                      conventionIn={c}
                      hideTitle={true}
                      hideSubtitle={true}
                    />
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            );
          }
        )}
      </Accordion>

      {readOnly || !organizationId ? (
        null
      ) : (
        <SimpleTooltip
          content="Create Convention"
          delay={1000}
          ariaLabel="Create Convention"
          triggerClassName="text-7xl fixed bottom-24 right-8 hover:text-gwgreen hover:cursor-pointer bg-gwdarkgreen rounded-full p-2"
          onPress={onOpenCreate}
        >
          <IoMdAddCircle aria-hidden="true" />
        </SimpleTooltip>
      )}

      <ConventionModal
        disclosure={createDisclosure}
        organizationId={organizationId}
      />
    </div>
  );
}
