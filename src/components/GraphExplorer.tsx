import { useMemo, useState } from "react";
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

type Props = {
  graph: GraphPayload;
  basePath: string;
  initialTopic?: string;
};

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

function debateLayout(
  graph: GraphPayload,
  visibleIds: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const participating = new Set<string>();
  const flowEdges = graph.flowEdges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .sort((a, b) => a.priority - b.priority);

  for (const edge of flowEdges) {
    participating.add(edge.source);
    participating.add(edge.target);
  }

  for (const node of graph.nodes) {
    if (visibleIds.has(node.id) && node.conversation?.opening) participating.add(node.id);
  }

  const incoming = new Map<string, typeof flowEdges>();
  for (const id of participating) incoming.set(id, []);
  for (const edge of flowEdges) {
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
      : Math.max(...parents.map((edge) => resolveDepth(edge.source, new Set(stack)) + 1));
    depth.set(id, value);
    return value;
  };

  for (const id of participating) resolveDepth(id);

  const columns = new Map<number, typeof graph.nodes>();
  for (const node of graph.nodes) {
    if (!participating.has(node.id)) continue;
    const column = depth.get(node.id) ?? 0;
    const list = columns.get(column) ?? [];
    list.push(node);
    columns.set(column, list);
  }

  const nodes: Node[] = [];
  for (const [column, list] of columns) {
    list.sort((a, b) =>
      (a.conversation?.priority ?? 50) - (b.conversation?.priority ?? 50) ||
      a.title.localeCompare(b.title)
    );
    list.forEach((node, row) => {
      const total = list.length;
      nodes.push({
        id: node.id,
        position: {
          x: column * 300,
          y: row * 145 - ((total - 1) * 145) / 2,
        },
        data: {
          label: (
            <div className="graph-node-label">
              <span>{node.type}</span>
              <strong>{node.title}</strong>
            </div>
          ),
        },
        style: nodeStyle(node.type),
      });
    });
  }

  const edges: Edge[] = flowEdges.map((edge) => ({
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
  }));

  return { nodes, edges };
}

function atlasLayout(
  graph: GraphPayload,
  visibleIds: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const grouped = new Map<string, typeof graph.nodes>();
  for (const node of graph.nodes.filter((node) => visibleIds.has(node.id))) {
    const list = grouped.get(node.type) ?? [];
    list.push(node);
    grouped.set(node.type, list);
  }

  const nodes: Node[] = [];
  for (const [type, list] of grouped) {
    const column = Math.max(0, TYPE_ORDER.indexOf(type));
    list.sort((a, b) => a.title.localeCompare(b.title));
    list.forEach((node, row) => {
      nodes.push({
        id: node.id,
        position: { x: column * 290, y: row * 145 },
        data: {
          label: (
            <div className="graph-node-label">
              <span>{node.type}</span>
              <strong>{node.title}</strong>
            </div>
          ),
        },
        style: nodeStyle(node.type),
      });
    });
  }

  const edges: Edge[] = graph.edges
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

  return { nodes, edges };
}

export default function GraphExplorer({ graph, basePath, initialTopic = "all" }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [topic, setTopic] = useState(initialTopic);
  const [mode, setMode] = useState<"debate" | "atlas">("debate");
  const [showSources, setShowSources] = useState(false);

  const topics = graph.nodes
    .filter((node) => node.type === "topic")
    .sort((a, b) => a.title.localeCompare(b.title));

  const visibleIds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return new Set(
      graph.nodes
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
  }, [graph.nodes, query, type, topic, showSources]);

  const layout = useMemo(
    () => mode === "debate"
      ? debateLayout(graph, visibleIds)
      : atlasLayout(graph, visibleIds),
    [graph, visibleIds, mode],
  );

  const nodeTypes = Array.from(new Set(graph.nodes.map((node) => node.type))).sort(
    (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b),
  );

  return (
    <div className="graph-shell">
      <ReactFlow
        key={mode + ":" + topic + ":" + type + ":" + showSources}
        nodes={layout.nodes}
        edges={layout.edges}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
        minZoom={0.18}
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
          <div className="graph-toolbar">
            <div className="graph-mode" role="group" aria-label="Graph mode">
              <button
                type="button"
                className={mode === "debate" ? "active" : ""}
                onClick={() => setMode("debate")}
              >
                Debate flow
              </button>
              <button
                type="button"
                className={mode === "atlas" ? "active" : ""}
                onClick={() => setMode("atlas")}
              >
                Knowledge atlas
              </button>
            </div>

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

            <div className="graph-toolbar-footer">
              <label className="source-toggle">
                <input
                  type="checkbox"
                  checked={showSources}
                  onChange={(event) => setShowSources(event.target.checked)}
                />
                Show source nodes
              </label>
              <span>{layout.nodes.length} shown</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
