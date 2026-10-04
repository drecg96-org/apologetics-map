import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  MarkerType,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphPayload } from "../lib/graph";
import LineExplorer from "./LineExplorer";

type ExplorerMode = "line" | "debate" | "atlas";

type Props = {
  graph: GraphPayload;
  basePath: string;
  initialTopic?: string;
  initialMode?: ExplorerMode;
  availableModes?: ExplorerMode[];
};

type FlowEdge = GraphPayload["flowEdges"][number];

const TYPE_ORDER = [
  "topic",
  "worldview",
  "doctrine",
  "question",
  "claim",
  "argument",
  "objection",
  "response",
  "evidence",
  "source",
];

const TYPE_ACCENT: Record<string, string> = {
  topic: "#315c8a",
  worldview: "#6750a4",
  doctrine: "#4d6475",
  question: "#8a5a17",
  claim: "#246b4b",
  argument: "#2f6f70",
  objection: "#9a3f3f",
  response: "#526f2e",
  evidence: "#7b5f21",
  source: "#646464",
};

const RELATION_ACCENT: Record<string, string> = {
  supports: "#3f6f55",
  evidence_for: "#3f6f55",
  challenges: "#9a3f3f",
  contradicts: "#9a3f3f",
  responds_to: "#315c8a",
  depends_on: "#6750a4",
  qualifies: "#8a5a17",
  related_to: "#74706a",
  addresses: "#315c8a",
};

function nodeStyle(type: string) {
  const accent = TYPE_ACCENT[type] ?? "#555";
  return {
    width: 220,
    border: `2px solid ${accent}`,
    borderRadius: 12,
    background: "var(--panel)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 650,
    padding: "12px 14px",
    boxShadow: "0 6px 18px rgba(0,0,0,.08)",
  };
}

function nodeKind(node: GraphPayload["nodes"][number]) {
  if (node.tags.includes("debate-gate")) return "stage gate";
  return node.type;
}

function topicScaffoldEdges(
  graph: GraphPayload,
  visibleIds: Set<string>,
): FlowEdge[] {
  const result: FlowEdge[] = [];

  for (const node of graph.nodes) {
    if (!visibleIds.has(node.id)) continue;

    if (node.type === "topic") {
      for (const parent of node.topics) {
        if (!visibleIds.has(parent)) continue;
        result.push({
          id: `structure--topic--${parent}--${node.id}`,
          source: parent,
          target: node.id,
          label: "topic",
          priority: 0,
        });
      }
      continue;
    }

    if (!node.conversation?.opening) continue;
    for (const topic of node.topics) {
      if (!visibleIds.has(topic)) continue;
      result.push({
        id: `structure--opening--${topic}--${node.id}`,
        source: topic,
        target: node.id,
        label: "main question",
        priority: 0,
      });
    }
  }

  return result;
}

function visibleFlowEdges(graph: GraphPayload, visibleIds: Set<string>) {
  return graph.flowEdges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label));
}

function structuralDepths(
  graph: GraphPayload,
  visibleIds: Set<string>,
  includeSources: boolean,
) {
  const flowEdges = visibleFlowEdges(graph, visibleIds);
  const scaffoldEdges = topicScaffoldEdges(graph, visibleIds);
  const structureEdges = [...scaffoldEdges, ...flowEdges];

  const participating = new Set<string>();
  for (const edge of structureEdges) {
    participating.add(edge.source);
    participating.add(edge.target);
  }

  for (const node of graph.nodes) {
    if (!visibleIds.has(node.id)) continue;
    if (node.type === "source" && !includeSources) continue;
    if (node.type === "topic" || node.conversation) participating.add(node.id);
  }

  const incoming = new Map<string, FlowEdge[]>();
  for (const id of participating) incoming.set(id, []);
  for (const edge of structureEdges) {
    const list = incoming.get(edge.target) ?? [];
    list.push(edge);
    incoming.set(edge.target, list);
  }

  const depth = new Map<string, number>();
  const resolveDepth = (id: string, stack = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (stack.has(id)) return 0;

    stack.add(id);
    const parents = incoming.get(id) ?? [];
    const value = parents.length === 0
      ? 0
      : Math.max(...parents.map((edge) =>
        resolveDepth(edge.source, new Set(stack)) + 1
      ));
    depth.set(id, value);
    return value;
  };

  for (const id of participating) resolveDepth(id);

  let maxDepth = Math.max(0, ...Array.from(depth.values()));

  // A small number of reference/context nodes may have no conversational position.
  // Keep them to the right of the structured debate instead of mixing them into roots.
  for (const node of graph.nodes) {
    if (!visibleIds.has(node.id) || depth.has(node.id)) continue;
    if (node.type === "source") {
      depth.set(node.id, maxDepth + 1);
      continue;
    }

    const topicParent = node.topics.find((topic) => visibleIds.has(topic));
    if (topicParent && depth.has(topicParent)) {
      depth.set(node.id, (depth.get(topicParent) ?? 0) + 1);
    } else {
      depth.set(node.id, maxDepth + 1);
    }
  }

  maxDepth = Math.max(maxDepth, ...Array.from(depth.values()));
  return { depth, flowEdges, scaffoldEdges, structureEdges, maxDepth };
}

function makeNodes(
  graph: GraphPayload,
  visibleIds: Set<string>,
  depth: Map<string, number>,
): Node[] {
  const columns = new Map<number, typeof graph.nodes>();

  for (const node of graph.nodes) {
    if (!visibleIds.has(node.id)) continue;
    const column = depth.get(node.id) ?? 0;
    const list = columns.get(column) ?? [];
    list.push(node);
    columns.set(column, list);
  }

  const nodes: Node[] = [];
  for (const [column, list] of Array.from(columns.entries()).sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) =>
      (a.conversation?.priority ?? 50) - (b.conversation?.priority ?? 50) ||
      TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
      a.title.localeCompare(b.title)
    );

    list.forEach((node, row) => {
      const total = list.length;
      nodes.push({
        id: node.id,
        position: {
          x: column * 310,
          y: row * 155 - ((total - 1) * 155) / 2,
        },
        data: {
          label: (
            <div className="graph-node-label">
              <span>{nodeKind(node)}</span>
              <strong>{node.title}</strong>
            </div>
          ),
        },
        style: nodeStyle(node.type),
      });
    });
  }

  return nodes;
}

function scaffoldEdge(edge: FlowEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#74706a" },
    style: { stroke: "#74706a", strokeWidth: 1.3, strokeDasharray: "5 5" },
    labelStyle: { fill: "var(--muted)", fontSize: 9, fontWeight: 700 },
    labelBgStyle: {
      fill: "var(--panel)",
      stroke: "var(--line)",
      strokeWidth: 1,
    },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 5,
  };
}

function debateFlowEdge(edge: FlowEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
    style: { stroke: "var(--accent)", strokeWidth: 1.8 },
    labelStyle: { fill: "var(--text)", fontSize: 10, fontWeight: 700 },
    labelBgStyle: {
      fill: "var(--panel)",
      stroke: "var(--line)",
      strokeWidth: 1,
    },
    labelBgPadding: [5, 3],
    labelBgBorderRadius: 5,
  };
}

function debateLayout(
  graph: GraphPayload,
  visibleIds: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const { depth, flowEdges, scaffoldEdges } = structuralDepths(
    graph,
    visibleIds,
    false,
  );

  const participating = new Set<string>();
  for (const edge of [...scaffoldEdges, ...flowEdges]) {
    participating.add(edge.source);
    participating.add(edge.target);
  }
  for (const node of graph.nodes) {
    if (!visibleIds.has(node.id)) continue;
    if (node.type === "source") continue;
    if (node.type === "topic" || node.conversation) participating.add(node.id);
  }

  const debateVisible = new Set(
    Array.from(visibleIds).filter((id) => participating.has(id)),
  );

  return {
    nodes: makeNodes(graph, debateVisible, depth),
    edges: [
      ...scaffoldEdges.map(scaffoldEdge),
      ...flowEdges.map(debateFlowEdge),
    ],
  };
}

function graphNeighborhood(
  graph: GraphPayload,
  focusId: string,
  depth: number,
) {
  const adjacency = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };

  for (const edge of graph.edges) connect(edge.source, edge.target);
  for (const edge of graph.flowEdges) connect(edge.source, edge.target);
  for (const node of graph.nodes) {
    for (const topic of node.topics) connect(node.id, topic);
  }

  const seen = new Set<string>([focusId]);
  let frontier = new Set<string>([focusId]);

  for (let step = 0; step < depth; step += 1) {
    const next = new Set<string>();
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        next.add(neighbor);
      }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }

  return seen;
}

function atlasLayout(
  graph: GraphPayload,
  visibleIds: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const { depth, flowEdges, scaffoldEdges } = structuralDepths(
    graph,
    visibleIds,
    true,
  );

  const nodes = makeNodes(graph, visibleIds, depth);

  const semanticEdges: Edge[] = graph.edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .filter((edge) => edge.type !== "related_to")
    .map((edge) => {
      const accent = RELATION_ACCENT[edge.type] ?? "#74706a";
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        markerEnd: { type: MarkerType.ArrowClosed, color: accent },
        style: { stroke: accent, strokeWidth: 1.6 },
        labelStyle: { fill: "var(--text)", fontSize: 10, fontWeight: 700 },
        labelBgStyle: {
          fill: "var(--panel)",
          stroke: "var(--line)",
          strokeWidth: 1,
        },
        labelBgPadding: [5, 3],
        labelBgBorderRadius: 5,
      };
    });

  // The knowledge graph keeps semantic edges primary, but uses a faint debate-flow
  // scaffold so its spatial organization matches the Debate Map.
  const flowScaffold = flowEdges.map((edge) => ({
    ...scaffoldEdge({ ...edge, label: "" }),
    id: `atlas--${edge.id}`,
    label: undefined,
  }));

  return {
    nodes,
    edges: [
      ...scaffoldEdges.map(scaffoldEdge),
      ...flowScaffold,
      ...semanticEdges,
    ],
  };
}

export default function GraphExplorer({
  graph,
  basePath,
  initialTopic = "all",
  initialMode = "line",
  availableModes = ["line", "debate", "atlas"],
}: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [topic, setTopic] = useState(initialTopic);
  const allowedModes = availableModes.length > 0 ? availableModes : ["line"];
  const startingMode = allowedModes.includes(initialMode) ? initialMode : allowedModes[0];
  const [mode, setMode] = useState<ExplorerMode>(startingMode);
  const [showSources, setShowSources] = useState(false);
  const [focusId, setFocusId] = useState("");
  const [focusDepth, setFocusDepth] = useState(2);
  const [shareStatus, setShareStatus] = useState("");
  const [urlHydrated, setUrlHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URL(window.location.href).searchParams;
    const requestedMode = params.get("mode") as ExplorerMode | null;
    if (requestedMode && allowedModes.includes(requestedMode)) setMode(requestedMode);

    const requestedTopic = params.get("topic");
    if (
      requestedTopic === "all" ||
      (requestedTopic && graph.nodes.some((node) => node.type === "topic" && node.id === requestedTopic))
    ) {
      setTopic(requestedTopic);
    }

    const requestedType = params.get("type");
    if (
      requestedType === "all" ||
      (requestedType && graph.nodes.some((node) => node.type === requestedType))
    ) {
      setType(requestedType);
    }

    setQuery(params.get("q") ?? "");
    setShowSources(params.get("sources") === "1");

    const requestedFocus = params.get("focus");
    if (requestedFocus && graph.nodes.some((node) => node.id === requestedFocus)) {
      setFocusId(requestedFocus);
    }

    const requestedDepth = Number(params.get("depth"));
    if (Number.isInteger(requestedDepth) && requestedDepth >= 1 && requestedDepth <= 4) {
      setFocusDepth(requestedDepth);
    }

    setUrlHydrated(true);
  }, []);

  useEffect(() => {
    if (!urlHydrated || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (allowedModes.length > 1) url.searchParams.set("mode", mode);
    else url.searchParams.delete("mode");

    if (topic === "all") url.searchParams.delete("topic");
    else url.searchParams.set("topic", topic);

    if (type === "all") url.searchParams.delete("type");
    else url.searchParams.set("type", type);

    if (query.trim()) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");

    if (showSources) url.searchParams.set("sources", "1");
    else url.searchParams.delete("sources");

    if (mode !== "line" && focusId) {
      url.searchParams.set("focus", focusId);
      url.searchParams.set("depth", String(focusDepth));
    } else {
      url.searchParams.delete("focus");
      url.searchParams.delete("depth");
    }

    if (mode !== "line") {
      url.searchParams.delete("node");
      url.searchParams.delete("path");
    }

    window.history.replaceState({}, "", url);
  }, [urlHydrated, mode, topic, type, query, showSources, focusId, focusDepth]);

  async function copyViewLink() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("Copied");
      window.setTimeout(() => setShareStatus(""), 1600);
    } catch {
      setShareStatus("Copy failed");
      window.setTimeout(() => setShareStatus(""), 1600);
    }
  }

  const topics = graph.nodes
    .filter((node) => node.type === "topic")
    .sort((a, b) => a.title.localeCompare(b.title));

  const focusedIds = useMemo(
    () => focusId && mode !== "line"
      ? graphNeighborhood(graph, focusId, focusDepth)
      : null,
    [graph, focusId, focusDepth, mode],
  );

  const visibleIds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return new Set(
      graph.nodes
        .filter((node) => !focusedIds || focusedIds.has(node.id))
        .filter((node) => showSources || node.type !== "source")
        .filter((node) => type === "all" || node.type === type)
        .filter((node) =>
          topic === "all" ||
          node.id === topic ||
          node.topics.includes(topic)
        )
        .filter((node) => {
          if (!normalized) return true;
          return [node.title, node.summary ?? "", node.id, ...node.tags]
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        })
        .map((node) => node.id),
    );
  }, [graph.nodes, query, type, topic, showSources, focusedIds]);

  const layout = useMemo(
    () => mode === "debate"
      ? debateLayout(graph, visibleIds)
      : atlasLayout(graph, visibleIds),
    [graph, visibleIds, mode],
  );

  const nodeTypes = Array.from(new Set(graph.nodes.map((node) => node.type))).sort(
    (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b),
  );

  const toolbar = (
    <div className="graph-toolbar">
      {allowedModes.length > 1 && (
        <div
          className="graph-mode"
          role="group"
          aria-label="Explorer mode"
          style={{ gridTemplateColumns: `repeat(${allowedModes.length}, minmax(0, 1fr))` }}
        >
          {allowedModes.includes("line") && (
            <button
              type="button"
              className={mode === "line" ? "active" : ""}
              onClick={() => setMode("line")}
            >
              Debate Explorer
            </button>
          )}
          {allowedModes.includes("debate") && (
            <button
              type="button"
              className={mode === "debate" ? "active" : ""}
              onClick={() => setMode("debate")}
            >
              Debate Map
            </button>
          )}
          {allowedModes.includes("atlas") && (
            <button
              type="button"
              className={mode === "atlas" ? "active" : ""}
              onClick={() => setMode("atlas")}
            >
              Knowledge Graph
            </button>
          )}
        </div>
      )}

      <input
        aria-label="Search map"
        type="search"
        value={query}
        placeholder="Search claims, objections…"
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="graph-filter-row">
        <select
          aria-label="Filter by topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        >
          <option value="all">All topics</option>
          {topics.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>

        <select
          aria-label="Filter by node type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="all">All node types</option>
          {nodeTypes.map((nodeType) => (
            <option key={nodeType} value={nodeType}>{nodeType}</option>
          ))}
        </select>
      </div>

      {mode !== "line" && focusId && (
        <div className="graph-focus-row">
          <span title={graph.nodes.find((node) => node.id === focusId)?.title}>
            Focused subgraph
          </span>
          <select
            aria-label="Focused subgraph depth"
            value={focusDepth}
            onChange={(event) => setFocusDepth(Number(event.target.value))}
          >
            <option value={1}>1 hop</option>
            <option value={2}>2 hops</option>
            <option value={3}>3 hops</option>
            <option value={4}>4 hops</option>
          </select>
          <button type="button" onClick={() => setFocusId("")}>Clear</button>
        </div>
      )}

      <div className="graph-toolbar-footer">
        {mode === "atlas" ? (
          <>
            <label className="source-toggle">
              <input
                type="checkbox"
                checked={showSources}
                onChange={(event) => setShowSources(event.target.checked)}
              />
              Show source nodes
            </label>
            <span>Layout follows debate structure; colored edges show semantic relations</span>
          </>
        ) : mode === "line" ? (
          <span>Follow one debate position at a time</span>
        ) : (
          <span>Topic → main question → branches → stage gates</span>
        )}
        <span>{mode === "line" ? visibleIds.size : layout.nodes.length} shown</span>
        <button
          type="button"
          className="graph-share-button"
          onClick={copyViewLink}
        >
          {shareStatus || "Copy view link"}
        </button>
      </div>
    </div>
  );

  if (mode === "line") {
    return (
      <div className="graph-shell line-shell">
        <div className="line-toolbar-wrap">{toolbar}</div>
        <LineExplorer
          graph={graph}
          visibleIds={Array.from(visibleIds)}
          basePath={basePath}
        />
      </div>
    );
  }

  return (
    <div className="graph-shell">
      <ReactFlow
        key={mode + ":" + topic + ":" + type + ":" + showSources}
        nodes={layout.nodes}
        edges={layout.edges}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
        minZoom={mode === "debate" ? 0.32 : 0.18}
        maxZoom={1.8}
        nodesDraggable={mode === "atlas"}
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          window.location.href = basePath + "node/" + node.id + "/";
        }}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          bgColor="var(--panel)"
          maskColor="color-mix(in srgb, var(--bg) 78%, transparent)"
          nodeColor="var(--muted)"
        />
        <Panel position="top-left">
          {toolbar}
        </Panel>
      </ReactFlow>
    </div>
  );
}
