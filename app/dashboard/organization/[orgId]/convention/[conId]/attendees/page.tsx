"use client";
import AttendeeGrid from "@/components/attendee/attendee-grid";
import React, { use } from "react";

type Params = Promise<{ orgId: string; conId: string }>;

export default function ConAttendeesView(props: { params: Params }) {
  const params = use(props.params);

  return (
    <div>
      <AttendeeGrid conventionId={Number(params.conId)} organizationId={Number(params.orgId)} />
    </div>
  );
}
