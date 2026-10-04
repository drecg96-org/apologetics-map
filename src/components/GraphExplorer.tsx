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

export default function GraphExplorer({ graph, basePath }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const visibleIds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return new Set(
      graph.nodes
        .filter((node) => type === "all" || node.type === type)
        .filter((node) => {
          if (!normalized) return true;
          return [node.title, node.summary ?? "", node.id, ...node.tags]
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        })
        .map((node) => node.id),
    );
  }, [graph.nodes, query, type]);

  const nodes = useMemo<Node[]>(() => {
    const grouped = new Map<string, typeof graph.nodes>();
    for (const node of graph.nodes) {
      const list = grouped.get(node.type) ?? [];
      list.push(node);
      grouped.set(node.type, list);
    }

    return graph.nodes.map((node) => {
      const column = Math.max(0, TYPE_ORDER.indexOf(node.type));
      const row = (grouped.get(node.type) ?? []).findIndex((item) => item.id === node.id);
      const accent = TYPE_ACCENT[node.type] ?? "#555";

      return {
        id: node.id,
        hidden: !visibleIds.has(node.id),
        position: { x: column * 290, y: row * 150 },
        data: { label: node.title },
        style: {
          width: 220,
          border: `2px solid ${accent}`,
          borderRadius: 12,
          background: "var(--panel)",
          color: "var(--text)",
          fontSize: 13,
          fontWeight: 650,
          padding: "12px 14px",
          boxShadow: "0 6px 18px rgba(0,0,0,.08)",
        },
      };
    });
  }, [graph.nodes, visibleIds]);

  const edges = useMemo<Edge[]>(() =>
    graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      hidden: !visibleIds.has(edge.source) || !visibleIds.has(edge.target),
      label: edge.label,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 1.5 },
      labelStyle: { fontSize: 10, fontWeight: 600 },
    })),
  [graph.edges, visibleIds]);

  const nodeTypes = Array.from(new Set(graph.nodes.map((node) => node.type))).sort(
    (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b),
  );

  return (
    <div className="graph-shell">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.15}
        maxZoom={1.8}
        nodesDraggable
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          window.location.href = `${basePath}node/${node.id}/`;
        }}
      >
        <Background gap={24} size={1} />
        <Controls />
        <MiniMap pannable zoomable />
        <Panel position="top-left">
          <div className="graph-toolbar">
            <input
              aria-label="Search map"
              type="search"
              value={query}
              placeholder="Search claims, objections…"
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              aria-label="Filter by node type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">All node types</option>
              {nodeTypes.map((nodeType) => (
                <option key={nodeType} value={nodeType}>
                  {nodeType}
                </option>
              ))}
            </select>
            <span>{visibleIds.size} shown</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
