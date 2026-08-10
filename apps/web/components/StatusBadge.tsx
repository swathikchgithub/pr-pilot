import { Badge } from "@pr-pilot/ui";
import type { RepoStatus } from "@pr-pilot/types";

const STATUS_TONE: Record<RepoStatus, "neutral" | "info" | "success" | "danger"> = {
  PENDING: "neutral",
  INDEXING: "info",
  READY: "success",
  FAILED: "danger",
};

export function StatusBadge({ status }: { status: RepoStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}
