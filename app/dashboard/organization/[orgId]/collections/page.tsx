"use client";
import CollectionGrid from "@/components/collection/collection-grid";
import { use } from "react";

type Params = Promise<{ orgId: string }>;

export default function OrgCollectionsView(props: { params: Params }) {
  const params = use(props.params);

  // CollectionGrid owns the data now (useOrgCollections), so the page just hands
  // it the org id — no more raw fetch here that the grid would re-fetch anyway.
  return <CollectionGrid organizationId={Number(params.orgId)} />;
}
