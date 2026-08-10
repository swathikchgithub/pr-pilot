"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ApiKey, ApiKeyWithSecret } from "@pr-pilot/types";
import { Badge, Button, Card, CardBody, EmptyState, Input, Table, type Column } from "@pr-pilot/ui";
import { ApiError, apiFetch } from "../../../lib/api-client";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setKeys(await apiFetch<ApiKey[]>("/v1/api-keys"));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await apiFetch<ApiKeyWithSecret>("/v1/api-keys", { method: "POST", body: JSON.stringify({ name }) });
      setNewSecret(created.secret);
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this API key.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    await apiFetch(`/v1/api-keys/${id}`, { method: "DELETE" });
    await load();
  }

  const columns: Column<ApiKey>[] = [
    { key: "name", header: "Name", render: (k) => k.name },
    { key: "prefix", header: "Key", render: (k) => <code className="text-xs">{k.keyPrefix}…</code> },
    {
      key: "status",
      header: "Status",
      render: (k) => (k.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>),
    },
    { key: "lastUsedAt", header: "Last used", render: (k) => (k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never") },
    {
      key: "actions",
      header: "",
      render: (k) =>
        k.revokedAt ? null : (
          <Button variant="ghost" onClick={() => handleRevoke(k.id)}>
            Revoke
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">API Keys</h1>
      <p className="max-w-xl text-sm text-slate-500">
        API keys authenticate AI coding agents and CI pipelines calling the PR-Pilot API — see the{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">@pr-pilot/sdk</code> package to wire one in.
      </p>

      {newSecret ? (
        <Card className="max-w-xl border-brand-300 bg-brand-50">
          <CardBody>
            <p className="text-sm font-medium text-brand-900">
              Copy this key now — it will not be shown again.
            </p>
            <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-sm">{newSecret}</code>
            <Button variant="secondary" className="mt-3" onClick={() => setNewSecret(null)}>
              Done
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card className="max-w-xl">
          <CardBody>
            <form onSubmit={handleCreate} className="flex items-end gap-2">
              <div className="flex-1">
                <Input label="Key name" placeholder="e.g. Claude Code CI" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button type="submit" isLoading={isSubmitting}>
                Create key
              </Button>
            </form>
            {error ? <p className="mt-2 text-sm text-risk-high">{error}</p> : null}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          {keys === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : keys.length === 0 ? (
            <EmptyState title="No API keys yet" description="Create one above to let an agent or CI pipeline call PR-Pilot." />
          ) : (
            <Table columns={columns} rows={keys} rowKey={(k) => k.id} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
