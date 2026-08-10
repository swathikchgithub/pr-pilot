import Link from "next/link";
import { Button } from "@pr-pilot/ui";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-6 text-center">
      <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
        Context &amp; governance layer for AI coding agents
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Let AI agents ship PRs fast —<br className="hidden sm:block" /> without flying blind.
      </h1>
      <p className="max-w-2xl text-lg text-slate-600">
        PR-Pilot gives AI coding agents and CI pipelines grounded, cited code context and
        pre-merge blast-radius analysis, with a full audit trail of what every agent read
        before it touched your codebase.
      </p>
      <div className="flex gap-3">
        <Link href="/register">
          <Button variant="primary">Get started</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
      </div>
      <dl className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <dt className="text-sm font-medium text-slate-500">Grounded retrieval</dt>
          <dd className="mt-1 text-sm text-slate-600">Hybrid vector + full-text search with cross-encoder reranking and inline citations.</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Impact analysis</dt>
          <dd className="mt-1 text-sm text-slate-600">Blast-radius reports on every diff — affected code, risk level, and suggested tests.</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Governance audit trail</dt>
          <dd className="mt-1 text-sm text-slate-600">Every agent query and citation logged and queryable for compliance review.</dd>
        </div>
      </dl>
    </main>
  );
}
