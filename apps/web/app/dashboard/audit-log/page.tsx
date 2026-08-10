"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditLogEntry, ListAuditLogResponse } from "@pr-pilot/types";
import { Badge, Button, Card, CardBody, EmptyState, Table, type Column } from "@pr-pilot/ui";
import { apiFetch } from "../../../lib/api-client";
import { truncate } from "../../../lib/format";

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<ListAuditLogResponse>("/v1/audit-log");
    setEntries(res.items);
    setCursor(res.nextCursor);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const res = await apiFetch<ListAuditLogResponse>(`/v1/audit-log?cursor=${cursor}`);
    setEntries((prev) => [...prev, ...res.items]);
    setCursor(res.nextCursor);
    setLoadingMore(false);
  }

  const columns: Column<AuditLogEntry>[] = [
    { key: "eventType", header: "Type", render: (e) => <Badge tone={e.eventType === "QUERY" ? "info" : "warning"}>{e.eventType}</Badge> },
    { key: "input", header: "Input", render: (e) => truncate(e.input) },
    { key: "citations", header: "Citations", render: (e) => e.citations.length },
    { key: "actor", header: "Actor", render: (e) => (e.apiKeyId ? "API key" : e.userId ? "Dashboard user" : "—") },
    { key: "createdAt", header: "When", render: (e) => new Date(e.createdAt).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
      <p className="max-w-xl text-sm text-slate-500">
        Every query and impact analysis run against your repositories, with the citations returned — the governance
        trail for anything an AI agent read before acting.
      </p>

      <Card>
        <CardBody>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : entries.length === 0 ? (
            <EmptyState title="No activity yet" description="Queries and impact analyses will show up here." />
          ) : (
            <>
              <Table columns={columns} rows={entries} rowKey={(e) => e.id} />
              {cursor ? (
                <div className="mt-4 flex justify-center">
                  <Button variant="secondary" isLoading={loadingMore} onClick={loadMore}>
                    Load more
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
