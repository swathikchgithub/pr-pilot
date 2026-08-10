"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { QueryResponse, Repo } from "@pr-pilot/types";
import { Badge, Button, Card, CardBody, EmptyState } from "@pr-pilot/ui";
import { ApiError, apiFetch } from "../../../lib/api-client";

export default function PlaygroundPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repoId, setRepoId] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Repo[]>("/v1/repos").then((all) => {
      const ready = all.filter((r) => r.status === "READY");
      setRepos(ready);
      if (ready.length > 0) setRepoId(ready[0].id);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);
    try {
      const response = await apiFetch<QueryResponse>("/v1/query", {
        method: "POST",
        body: JSON.stringify({ repoId, question }),
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The query failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (repos.length === 0) {
    return (
      <EmptyState
        title="No indexed repositories yet"
        description="Register a repository and wait for it to finish indexing before using the playground."
      />
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Playground</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Repository
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
          >
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.githubUrl}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Question
          <textarea
            className="min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="How does the hybrid search RRF merge work?"
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <Button type="submit" isLoading={isSubmitting} className="self-start">
          Ask
        </Button>
      </form>

      {error ? <p className="text-sm text-risk-high">{error}</p> : null}

      {result ? (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <p className="whitespace-pre-wrap text-sm text-slate-900">{result.answer}</p>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Citations</p>
              <div className="flex flex-wrap gap-2">
                {result.citations.map((c) => (
                  <Badge key={c.chunkId} tone="info">
                    {c.filename}:{c.startLine}-{c.endLine}
                  </Badge>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
