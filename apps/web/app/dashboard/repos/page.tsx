"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Repo } from "@pr-pilot/types";
import { Button, Card, CardBody, EmptyState, Input, Table, type Column } from "@pr-pilot/ui";
import { ApiError, apiFetch } from "../../../lib/api-client";
import { StatusBadge } from "../../../components/StatusBadge";

const POLL_INTERVAL_MS = 5000;

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<Repo[]>("/v1/repos");
    setRepos(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hasActiveIngestion = repos?.some((r) => r.status === "PENDING" || r.status === "INDEXING");
    if (!hasActiveIngestion) return;
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [repos, load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/v1/repos", { method: "POST", body: JSON.stringify({ githubUrl }) });
      setGithubUrl("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register this repository.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: Column<Repo>[] = [
    { key: "githubUrl", header: "Repository", render: (r) => r.githubUrl },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "chunkCount", header: "Chunks", render: (r) => r.chunkCount },
    { key: "lastIndexedAt", header: "Last indexed", render: (r) => (r.lastIndexedAt ? new Date(r.lastIndexedAt).toLocaleString() : "—") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Repositories</h1>

      <Card className="max-w-xl">
        <CardBody>
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="GitHub URL"
                placeholder="https://github.com/owner/repo"
                required
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>
            <Button type="submit" isLoading={isSubmitting}>
              Index repository
            </Button>
          </form>
          {error ? <p className="mt-2 text-sm text-risk-high">{error}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {repos === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : repos.length === 0 ? (
            <EmptyState title="No repositories yet" description="Register a GitHub repository above to start indexing it." />
          ) : (
            <Table columns={columns} rows={repos} rowKey={(r) => r.id} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
