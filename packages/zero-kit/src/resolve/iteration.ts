/**
 * The iteration log — the pure half (issue #426; docs/architecture.md, "The
 * authoring surface").
 *
 * The design-system skill calls the validate → fix loop "the point", and
 * until now nothing observed it: a generating agent could not say whether
 * its seventh run was better than its first, and an edit to the skill could
 * not be measured by the iterations it saved. One entry per `zero:validate`
 * run, appended to a local JSONL file the author opts into, is the smallest
 * record that answers both.
 *
 * This module knows nothing about files or the environment — it turns a
 * validation result (and, when the design system compiled, its coverage
 * report) into an entry, and a sequence of entries into the one line a run
 * prints. The Node half — where the file lives, append and read — is
 * `commands/iteration-log.ts`.
 */
import type { DesignSystemReport } from './report.js';
import type { ScoreGrade } from './score.js';
import type { ValidationIssue, ValidationResult } from './validate.js';

/** One `zero:validate` run, as one line of the log. */
export interface IterationEntry {
    /** When the run finished, ISO 8601. */
    ts: string;
    /** The design system's `name`. */
    name: string;
    errors: number;
    warnings: number;
    /** Absent when the design system did not compile — there is no report to score. */
    score?: { total: number; grade: ScoreGrade };
    /**
     * The rules that fired most, at most five, by count then id. A rule is
     * its `rule` id when it has one, otherwise the first two segments of its
     * `where` (`recipes.button`, `themes.dark`) — honest until every rule
     * carries an id.
     */
    top: Array<{ id: string; count: number }>;
    /** Wall-clock for load + validate + report, whole milliseconds. */
    ms: number;
}

/** How many families a log line names. */
const TOP_FAMILIES = 5;

/**
 * The family an issue belongs to when its rule has no id: the first two
 * dot-segments of `where`, or the whole thing when there are fewer. Two
 * segments is the grain the loop works at — a component's recipe, a theme —
 * where one would say only "recipes" and three would split one recipe's
 * issues across its parts.
 */
export function whereFamily(where: string): string {
    const parts = where.split('.');
    return parts.length <= 2 ? where : `${parts[0]}.${parts[1]}`;
}

function topFamilies(issues: readonly ValidationIssue[]): IterationEntry['top'] {
    const counts = new Map<string, number>();
    for (const issue of issues) {
        const id = issue.rule ?? whereFamily(issue.where);
        counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts]
        .map(([id, count]) => ({ id, count }))
        // Count descending, then id ascending — a log line is diffed by eye,
        // so the same issues must always print in the same order.
        .sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, TOP_FAMILIES);
}

export interface IterationEntryInput {
    name: string;
    result: ValidationResult;
    /** The coverage report, when the design system compiled. */
    report?: DesignSystemReport;
    /** Wall-clock in milliseconds; rounded, since a log line is not a benchmark. */
    ms: number;
    /** The run's end time — injectable so a test can pin the timestamp. */
    now?: Date;
}

/** The entry for one run. */
export function iterationEntryFrom({ name, result, report, ms, now }: IterationEntryInput): IterationEntry {
    const entry: IterationEntry = {
        ts: (now ?? new Date()).toISOString(),
        name,
        errors: result.errors.length,
        warnings: result.warnings.length,
        top: topFamilies([...result.errors, ...result.warnings]),
        ms: Math.round(ms),
    };
    // Only present when it exists: an absent key survives the JSONL round trip
    // as absent, where `score: undefined` would not.
    if (report) entry.score = { total: report.score.total, grade: report.score.grade };
    return entry;
}

/** A structural check for a parsed log line — the reader skips anything else. */
export function isIterationEntry(value: unknown): value is IterationEntry {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const v = value as Record<string, unknown>;
    return typeof v['ts'] === 'string'
        && typeof v['name'] === 'string'
        && typeof v['errors'] === 'number'
        && typeof v['warnings'] === 'number'
        && Array.isArray(v['top'])
        && typeof v['ms'] === 'number';
}

const scoreText = (score: IterationEntry['score']): string => (score ? `${score.total} → ${score.grade}` : 'n/a');
const wasScore = (score: IterationEntry['score']): string => (score ? `${score.total} ${score.grade}` : 'n/a');

/**
 * One line per run, each compared against the run before it. The first line
 * has nothing to compare against and says so by omission; every later line
 * carries `(was …)` beside each count, so the trend reads without the
 * earlier lines on screen — the CLI prints only the latest.
 */
export function formatIterationLog(entries: readonly IterationEntry[]): string[] {
    return entries.map((entry, i) => {
        const prev = i > 0 ? entries[i - 1] : undefined;
        const was = (value: string): string => (prev ? ` (was ${value})` : '');
        const head = `iteration ${i + 1} — errors ${entry.errors}${was(String(prev?.errors))}, `
            + `warnings ${entry.warnings}${was(String(prev?.warnings))}, `
            + `score ${scoreText(entry.score)}${was(wasScore(prev?.score))}`;
        const top = entry.top.length > 0
            ? `; top: ${entry.top.map((t) => `${t.id} ×${t.count}`).join(', ')}`
            : '';
        return head + top;
    });
}
