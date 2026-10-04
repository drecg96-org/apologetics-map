import { loadGraph, toGraphPayload, type LoadedNode } from "../src/lib/graph.js";
import { lookupScriptureReference } from "../src/lib/scripture.js";

type Mode = "all" | "semantic" | "flow";

type ParsedArgs = {
  command: string;
  positionals: string[];
  flags: Map<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      index += 1;
    } else {
      flags.set(key, true);
    }
  }

  return { command, positionals, flags };
}

function intFlag(flags: Map<string, string | boolean>, key: string, fallback: number) {
  const raw = flags.get(key);
  if (raw === undefined || raw === true) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`--${key} must be a non-negative integer`);
  }
  return parsed;
}

function modeFlag(flags: Map<string, string | boolean>): Mode {
  const raw = flags.get("mode");
  if (raw === undefined || raw === true) return "all";
  if (raw === "all" || raw === "semantic" || raw === "flow") return raw;
  throw new Error("--mode must be all, semantic, or flow");
}

function emit(value: unknown, compact = false) {
  console.log(JSON.stringify(value, null, compact ? 0 : 2));
}

function brief(node: LoadedNode) {
  return {
    id: node.id,
    title: node.title,
    type: node.type,
    summary: node.summary,
    topics: node.topics,
    tags: node.tags,
    terminal: node.conversation?.terminal,
  };
}

function sortById<T extends { id: string }>(items: T[]) {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function buildIndexes(nodes: LoadedNode[]) {
  const semanticOutgoing = new Map<string, Array<{ source: string; target: string; type: string; note?: string }>>();
  const semanticIncoming = new Map<string, Array<{ source: string; target: string; type: string; note?: string }>>();
  const flowOutgoing = new Map<string, Array<{ source: string; target: string; label: string; priority: number }>>();
  const flowIncoming = new Map<string, Array<{ source: string; target: string; label: string; priority: number }>>();

  for (const node of nodes) {
    for (const relationship of node.relationships) {
      const edge = {
        source: node.id,
        target: relationship.target,
        type: relationship.type,
        note: relationship.note,
      };
      semanticOutgoing.set(node.id, [...(semanticOutgoing.get(node.id) ?? []), edge]);
      semanticIncoming.set(relationship.target, [...(semanticIncoming.get(relationship.target) ?? []), edge]);
    }

    for (const [index, previous] of (node.conversation?.follows ?? []).entries()) {
      const edge = {
        source: previous,
        target: node.id,
        label: node.conversation?.label ?? node.type,
        priority: node.conversation?.priority ?? 50,
      };
      flowOutgoing.set(previous, [...(flowOutgoing.get(previous) ?? []), edge]);
      flowIncoming.set(node.id, [...(flowIncoming.get(node.id) ?? []), edge]);
      void index;
    }
  }

  for (const map of [semanticOutgoing, semanticIncoming]) {
    for (const [key, edges] of map) {
      map.set(key, [...edges].sort((a, b) =>
        a.type.localeCompare(b.type) || a.target.localeCompare(b.target) || a.source.localeCompare(b.source)
      ));
    }
  }
  for (const map of [flowOutgoing, flowIncoming]) {
    for (const [key, edges] of map) {
      map.set(key, [...edges].sort((a, b) =>
        a.priority - b.priority || a.target.localeCompare(b.target) || a.source.localeCompare(b.source)
      ));
    }
  }

  return { semanticOutgoing, semanticIncoming, flowOutgoing, flowIncoming };
}

function requireNode(byId: Map<string, LoadedNode>, id: string | undefined) {
  if (!id) throw new Error("Missing node id.");
  const node = byId.get(id);
  if (!node) throw new Error(`Unknown node: ${id}`);
  return node;
}

function neighborhoodIds(
  start: string,
  depth: number,
  mode: Mode,
  indexes: ReturnType<typeof buildIndexes>,
) {
  const seen = new Set([start]);
  let frontier = [start];

  for (let level = 0; level < depth; level += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      const candidates = new Set<string>();
      if (mode !== "flow") {
        for (const edge of indexes.semanticOutgoing.get(id) ?? []) candidates.add(edge.target);
        for (const edge of indexes.semanticIncoming.get(id) ?? []) candidates.add(edge.source);
      }
      if (mode !== "semantic") {
        for (const edge of indexes.flowOutgoing.get(id) ?? []) candidates.add(edge.target);
        for (const edge of indexes.flowIncoming.get(id) ?? []) candidates.add(edge.source);
      }
      for (const candidate of candidates) {
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        next.push(candidate);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  return seen;
}

function edgesWithin(ids: Set<string>, mode: Mode, indexes: ReturnType<typeof buildIndexes>) {
  const semantic = mode === "flow"
    ? []
    : [...indexes.semanticOutgoing.values()].flat().filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const flow = mode === "semantic"
    ? []
    : [...indexes.flowOutgoing.values()].flat().filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  return { semantic, flow };
}

function shortestPath(
  start: string,
  target: string,
  mode: Mode,
  indexes: ReturnType<typeof buildIndexes>,
) {
  const queue: string[] = [start];
  const previous = new Map<string, { id: string; kind: "semantic" | "flow"; edge: unknown }>();
  const seen = new Set([start]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === target) break;

    const nextSteps: Array<{ id: string; kind: "semantic" | "flow"; edge: unknown }> = [];
    if (mode !== "flow") {
      for (const edge of indexes.semanticOutgoing.get(current) ?? []) {
        nextSteps.push({ id: edge.target, kind: "semantic", edge });
      }
      for (const edge of indexes.semanticIncoming.get(current) ?? []) {
        nextSteps.push({ id: edge.source, kind: "semantic", edge });
      }
    }
    if (mode !== "semantic") {
      for (const edge of indexes.flowOutgoing.get(current) ?? []) {
        nextSteps.push({ id: edge.target, kind: "flow", edge });
      }
      for (const edge of indexes.flowIncoming.get(current) ?? []) {
        nextSteps.push({ id: edge.source, kind: "flow", edge });
      }
    }

    for (const step of nextSteps) {
      if (seen.has(step.id)) continue;
      seen.add(step.id);
      previous.set(step.id, { id: current, kind: step.kind, edge: step.edge });
      queue.push(step.id);
    }
  }

  if (!seen.has(target)) return null;

  const ids = [target];
  const hops: Array<{ from: string; to: string; kind: "semantic" | "flow"; edge: unknown }> = [];
  let cursor = target;
  while (cursor !== start) {
    const prev = previous.get(cursor);
    if (!prev) return null;
    hops.push({ from: prev.id, to: cursor, kind: prev.kind, edge: prev.edge });
    cursor = prev.id;
    ids.push(cursor);
  }

  ids.reverse();
  hops.reverse();
  return { ids, hops };
}

function buildLine(
  id: string,
  depth: number,
  byId: Map<string, LoadedNode>,
  indexes: ReturnType<typeof buildIndexes>,
  path = new Set<string>(),
): unknown {
  const node = byId.get(id);
  if (!node) return null;
  const nextPath = new Set(path);
  nextPath.add(id);

  const moves = depth <= 0
    ? []
    : (indexes.flowOutgoing.get(id) ?? []).map((edge) => ({
        label: edge.label,
        priority: edge.priority,
        node: brief(byId.get(edge.target)!),
        cycle: nextPath.has(edge.target),
        next: nextPath.has(edge.target)
          ? []
          : buildLine(edge.target, depth - 1, byId, indexes, nextPath),
      }));

  return {
    node: brief(node),
    terminal: node.conversation?.terminal ?? null,
    moves,
  };
}

async function scriptureContext(node: LoadedNode) {
  return (await Promise.all(node.scripture.map(async (entry) => {
    const lookup = await lookupScriptureReference(entry.reference);
    if (!lookup) return { reference: entry.reference, note: entry.note, found: false };
    return {
      reference: lookup.canonical,
      note: entry.note,
      found: true,
      web: lookup.verses.slice(0, 12),
      youVersionEsvUrl: lookup.youVersionEsvUrl,
      truncated: lookup.verses.length > 12,
    };
  })));
}

function usage() {
  return {
    usage: "npm run graph -- <command> [args] [--flags]",
    commands: {
      node: "node <id> — full node plus incoming/outgoing semantic and debate edges",
      neighbors: "neighbors <id> [--depth 1] [--mode all|semantic|flow]",
      line: "line <id> [--depth 4] — outgoing debate tree with terminal commitments",
      path: "path <from> <to> [--mode all|semantic|flow] — shortest traversable path",
      search: "search <query> [--limit 20] — ids/titles/summaries/tags/aliases",
      topic: "topic <topic-id> — topic members grouped by node type",
      sources: "sources <id> — source records cited by a node",
      stats: "stats — graph/source/debate coverage summary",
      packet: "packet <id> [--depth 2] — bounded agent context packet",
    },
    flags: {
      compact: "--compact emits one-line JSON",
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const compact = args.flags.has("compact");
  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    emit(usage(), compact);
    return;
  }

  const { nodes, byId } = await loadGraph();
  const indexes = buildIndexes(nodes);

  if (args.command === "node") {
    const node = requireNode(byId, args.positionals[0]);
    emit({
      node: {
        ...node,
        html: undefined,
      },
      semantic: {
        incoming: indexes.semanticIncoming.get(node.id) ?? [],
        outgoing: indexes.semanticOutgoing.get(node.id) ?? [],
      },
      debate: {
        previous: indexes.flowIncoming.get(node.id) ?? [],
        next: indexes.flowOutgoing.get(node.id) ?? [],
      },
    }, compact);
    return;
  }

  if (args.command === "neighbors") {
    const node = requireNode(byId, args.positionals[0]);
    const depth = intFlag(args.flags, "depth", 1);
    const mode = modeFlag(args.flags);
    const ids = neighborhoodIds(node.id, depth, mode, indexes);
    emit({
      root: node.id,
      depth,
      mode,
      nodes: sortById([...ids].map((id) => brief(byId.get(id)!))),
      edges: edgesWithin(ids, mode, indexes),
    }, compact);
    return;
  }

  if (args.command === "line") {
    const node = requireNode(byId, args.positionals[0]);
    const depth = intFlag(args.flags, "depth", 4);
    emit({
      root: node.id,
      depth,
      previous: (indexes.flowIncoming.get(node.id) ?? []).map((edge) => ({
        ...edge,
        node: brief(byId.get(edge.source)!),
      })),
      tree: buildLine(node.id, depth, byId, indexes),
    }, compact);
    return;
  }

  if (args.command === "path") {
    const from = requireNode(byId, args.positionals[0]);
    const to = requireNode(byId, args.positionals[1]);
    const mode = modeFlag(args.flags);
    const result = shortestPath(from.id, to.id, mode, indexes);
    emit({
      from: from.id,
      to: to.id,
      mode,
      found: Boolean(result),
      path: result
        ? result.ids.map((id) => brief(byId.get(id)!))
        : [],
      hops: result?.hops ?? [],
    }, compact);
    return;
  }

  if (args.command === "search") {
    const query = args.positionals.join(" ").trim().toLowerCase();
    if (!query) throw new Error("search requires a query");
    const limit = intFlag(args.flags, "limit", 20);
    const results = nodes
      .map((node) => {
        const fields = [
          node.id,
          node.title,
          node.summary ?? "",
          node.body,
          ...node.tags,
          ...node.aliases,
          ...node.topics,
        ].join(" ").toLowerCase();
        const title = node.title.toLowerCase();
        const id = node.id.toLowerCase();
        const score =
          (id === query ? 100 : 0) +
          (title === query ? 90 : 0) +
          (id.includes(query) ? 30 : 0) +
          (title.includes(query) ? 25 : 0) +
          (node.tags.some((tag) => tag.includes(query)) ? 10 : 0) +
          (fields.includes(query) ? 1 : 0);
        return { node, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title))
      .slice(0, limit)
      .map((item) => ({ ...brief(item.node), score: item.score }));
    emit({ query, count: results.length, results }, compact);
    return;
  }

  if (args.command === "topic") {
    const topic = requireNode(byId, args.positionals[0]);
    if (topic.type !== "topic") throw new Error(`${topic.id} is not a topic node`);
    const members = nodes.filter((node) => node.id !== topic.id && node.topics.includes(topic.id));
    const grouped = Object.fromEntries(
      [...new Set(members.map((node) => node.type))].sort().map((type) => [
        type,
        members.filter((node) => node.type === type).map(brief).sort((a, b) => a.title.localeCompare(b.title)),
      ]),
    );
    emit({ topic: brief(topic), count: members.length, grouped }, compact);
    return;
  }

  if (args.command === "sources") {
    const node = requireNode(byId, args.positionals[0]);
    const sources = node.references.map((reference) => {
      const source = byId.get(reference.source);
      return {
        reference,
        source: source ? {
          ...brief(source),
          source: source.source,
          processing: source.processing,
        } : null,
      };
    });
    emit({ node: brief(node), count: sources.length, sources }, compact);
    return;
  }

  if (args.command === "stats") {
    const payload = toGraphPayload(nodes);
    const sources = nodes.filter((node) => node.type === "source");
    const debateNodes = nodes.filter((node) => node.type !== "source" && node.type !== "topic");
    const argumentNodes = nodes.filter((node) => node.type === "argument");
    const evidenceNodes = nodes.filter((node) => node.type === "evidence");
    const structuredPremiseIds = new Set(
      argumentNodes.flatMap((node) =>
        (node.argument?.statements ?? [])
          .filter((statement) => statement.role === "premise")
          .map((statement) => statement.node),
      ),
    );
    const referenceCounts = new Map<string, number>();
    for (const node of nodes) {
      for (const reference of node.references) {
        referenceCounts.set(reference.source, (referenceCounts.get(reference.source) ?? 0) + 1);
      }
    }
    const byType = Object.fromEntries(
      [...new Set(nodes.map((node) => node.type))].sort().map((type) => [
        type,
        nodes.filter((node) => node.type === type).length,
      ]),
    );
    emit({
      nodes: nodes.length,
      byType,
      semanticEdges: payload.edges.length,
      debateMoves: payload.flowEdges.length,
      debate: {
        openings: debateNodes.filter((node) => node.conversation?.opening).map((node) => node.id).sort(),
        terminals: debateNodes.filter((node) => node.conversation?.terminal).map((node) => ({
          id: node.id,
          terminal: node.conversation!.terminal,
        })).sort((a, b) => a.id.localeCompare(b.id)),
        noIncomingMove: debateNodes.filter((node) =>
          !node.conversation?.opening && (indexes.flowIncoming.get(node.id) ?? []).length === 0
        ).map((node) => node.id).sort(),
        noOutgoingMove: debateNodes.filter((node) =>
          !node.conversation?.terminal && (indexes.flowOutgoing.get(node.id) ?? []).length === 0
        ).map((node) => node.id).sort(),
      },
      sources: {
        total: sources.length,
        indexedNeedsSummary: sources.filter((node) => node.processing?.indexed && !node.processing?.summarized).map((node) => node.id).sort(),
        summarizedNotIntegrated: sources.filter((node) =>
          node.processing?.summarized && (referenceCounts.get(node.id) ?? 0) === 0
        ).map((node) => node.id).sort(),
        integrated: sources.filter((node) => (referenceCounts.get(node.id) ?? 0) > 0).length,
        unreviewedSummaries: sources.filter((node) =>
          node.processing?.summarized && !node.processing?.reviewed
        ).map((node) => node.id).sort(),
      },
      formalArguments: {
        total: argumentNodes.length,
        structured: argumentNodes.filter((node) => node.argument).map((node) => node.id).sort(),
        unstructured: argumentNodes.filter((node) => !node.argument).map((node) => node.id).sort(),
        inferenceChallenges: nodes.reduce((total, node) => total + node.inference_challenges.length, 0),
        inferencesWithoutChallenge: argumentNodes.flatMap((argumentNode) =>
          (argumentNode.argument?.inferences ?? [])
            .filter((inference) => !nodes.some((candidate) =>
              candidate.inference_challenges.some((challenge) =>
                challenge.argument === argumentNode.id && challenge.inference === inference.id
              )
            ))
            .map((inference) => `${argumentNode.id}#${inference.id}`)
        ).sort(),
        premiseClaims: [...structuredPremiseIds].sort(),
        premiseClaimsWithoutSupport: [...structuredPremiseIds].filter((id) => {
          const node = byId.get(id);
          const incoming = indexes.semanticIncoming.get(id) ?? [];
          return Boolean(node)
            && node!.references.length === 0
            && !incoming.some((edge) => edge.type === "supports" || edge.type === "evidence_for");
        }).sort(),
        premiseClaimsWithoutChallenge: [...structuredPremiseIds].filter((id) => {
          const incoming = indexes.semanticIncoming.get(id) ?? [];
          return !incoming.some((edge) => edge.type === "challenges" || edge.type === "contradicts");
        }).sort(),
      },
      evidence: {
        total: evidenceNodes.length,
        withSources: evidenceNodes.filter((node) => node.references.length > 0).length,
        withoutSources: evidenceNodes.filter((node) => node.references.length === 0).map((node) => node.id).sort(),
      },
      sourcing: {
        debateNodesWithoutReferences: debateNodes.filter((node) => node.references.length === 0).map((node) => node.id).sort(),
        sourceHeavyWithoutEvidence: debateNodes.filter((node) => {
          if (node.type === "evidence" || node.references.length < 8) return false;
          const incoming = indexes.semanticIncoming.get(node.id) ?? [];
          return !incoming.some((edge) => edge.type === "evidence_for" || byId.get(edge.source)?.type === "evidence");
        }).map((node) => node.id).sort(),
      },
      graphHealth: {
        orphanedDebateNodes: debateNodes.filter((node) =>
          (indexes.semanticIncoming.get(node.id) ?? []).length === 0
          && (indexes.semanticOutgoing.get(node.id) ?? []).length === 0
          && (indexes.flowIncoming.get(node.id) ?? []).length === 0
          && (indexes.flowOutgoing.get(node.id) ?? []).length === 0
          && !node.conversation?.opening
        ).map((node) => node.id).sort(),
      },
    }, compact);
    return;
  }

  if (args.command === "packet") {
    const node = requireNode(byId, args.positionals[0]);
    const depth = intFlag(args.flags, "depth", 2);
    const ids = neighborhoodIds(node.id, depth, "all", indexes);
    const sourceIds = new Set<string>();
    for (const id of ids) {
      for (const reference of byId.get(id)?.references ?? []) sourceIds.add(reference.source);
    }
    const sources = [...sourceIds]
      .map((id) => byId.get(id))
      .filter((item): item is LoadedNode => Boolean(item && item.type === "source"))
      .map((source) => ({
        id: source.id,
        title: source.title,
        summary: source.summary,
        metadata: source.source,
        processing: source.processing,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    emit({
      task: "Use this bounded graph packet to reason about the selected apologetics node without reconstructing the whole repository.",
      root: {
        ...brief(node),
        body: node.body,
        relationships: node.relationships,
        conversation: node.conversation,
        argument: node.argument,
        inference_challenges: node.inference_challenges,
        references: node.references,
        scripture: node.scripture,
      },
      depth,
      neighborhood: {
        nodes: sortById([...ids].filter((id) => id !== node.id).map((id) => brief(byId.get(id)!))),
        edges: edgesWithin(ids, "all", indexes),
      },
      debateLine: buildLine(node.id, depth, byId, indexes),
      sources,
      scriptureContext: await scriptureContext(node),
    }, compact);
    return;
  }

  throw new Error(`Unknown graph command: ${args.command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("Run: npm run graph -- help");
  process.exit(1);
});
