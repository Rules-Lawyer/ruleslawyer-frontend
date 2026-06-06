import dynamic from "next/dynamic";

const ConventionTypeGrid = dynamic(() => import("@/components/convention-type/convention-type-grid"), {
  loading: () => <p>Loading...</p>,
});

type Params = Promise<{ orgId: string }>;

export default async function ConventionTypesView(props: { params: Params }) {
  const params = await props.params;

  return (
    <ConventionTypeGrid organizationId={Number(params.orgId)} />
  );
}
