"use client";

import { useEffect, useState } from "react";
import type { Organization } from "@pr-pilot/types";
import { Card, CardBody, CardHeader } from "@pr-pilot/ui";
import { apiFetch } from "../../lib/api-client";

export default function DashboardOverviewPage() {
  const [org, setOrg] = useState<Organization | null>(null);

  useEffect(() => {
    apiFetch<Organization>("/v1/orgs/current").then(setOrg).catch(() => setOrg(null));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <h2 className="font-medium">Organization</h2>
        </CardHeader>
        <CardBody>
          {org ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Name</dt>
              <dd className="text-slate-900">{org.name}</dd>
              <dt className="text-slate-500">Slug</dt>
              <dd className="text-slate-900">{org.slug}</dd>
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-900">{new Date(org.createdAt).toLocaleDateString()}</dd>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Loading…</p>
          )}
        </CardBody>
      </Card>
      <p className="max-w-lg text-sm text-slate-500">
        Register a repository under <span className="font-medium">Repositories</span>, mint an API key under{" "}
        <span className="font-medium">API Keys</span>, then point your coding agent or CI at the PR-Pilot API using
        the <code className="rounded bg-slate-100 px-1 py-0.5">@pr-pilot/sdk</code> package — or try it yourself in
        the <span className="font-medium">Playground</span>.
      </p>
    </div>
  );
}
