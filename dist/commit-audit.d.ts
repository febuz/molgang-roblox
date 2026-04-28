/**
 * Commit audit trail — every git commit recorded so we can answer
 * "what happened, when, by whom, for which task".
 *
 * Source of records:
 *   - scripts/git-hooks/post-commit fires after every commit and POSTs to
 *     /api/audit/commit with the SHA, subject, author, and timestamp.
 *   - On startup the audit is back-filled from `git log` so nothing is lost
 *     if the hook wasn't installed yet (idempotent — same SHA never inserted twice).
 *
 * Storage: append-only JSONL on EDS2. Cheap to scan, easy to grep.
 */
export interface CommitAuditEntry {
    sha: string;
    shortSha: string;
    author: string;
    timestamp: string;
    subject: string;
    attributedAgent: string;
    taskRef?: string;
    recordedAt: string;
    source: 'hook' | 'backfill' | 'api';
}
export declare function record(input: {
    sha: string;
    subject: string;
    author: string;
    timestamp?: string;
    source?: 'hook' | 'api';
}): {
    ok: true;
    entry: CommitAuditEntry;
} | {
    ok: false;
    reason: string;
};
export declare function list(filter?: {
    agent?: string;
    taskRef?: string;
    sinceTs?: string;
    limit?: number;
}): CommitAuditEntry[];
export declare function summary(): {
    total: number;
    byAgent: {
        [agent: string]: number;
    };
    bySource: {
        [source: string]: number;
    };
    newestSha: string | undefined;
    newestAt: string | undefined;
    oldestSha: string | undefined;
    oldestAt: string | undefined;
    file: string;
};
/**
 * Backfill from `git log`. Idempotent: SHAs already in the audit file are
 * skipped. Run on startup so an audit log that was started after the repo
 * already had history catches up to where we are.
 */
export declare function backfillFromGit(maxCommits?: number): {
    added: number;
    skipped: number;
};
//# sourceMappingURL=commit-audit.d.ts.map