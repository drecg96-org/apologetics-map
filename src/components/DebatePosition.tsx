import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphPayload } from "../lib/graph";

type Props = {
  graph: GraphPayload;
  currentId: string;
  basePath: string;
};

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

function makeNode(
  id: string,
  title: string,
  type: string,
  x: number,
  y: number,
  current = false,
): Node {
  const accent = TYPE_ACCENT[type] ?? "#646464";
  return {
    id,
    position: { x, y },
    data: {
      label: (
        <div className="position-node-label">
          <span>{current ? "current · " : ""}{type}</span>
          <strong>{title}</strong>
        </div>
      ),
    },
    style: {
      width: 220,
      padding: 0,
      borderRadius: 12,
      border: (current ? "3px solid " : "2px solid ") + accent,
      background: "var(--panel)",
      color: "var(--text)",
      boxShadow: current
        ? "0 10px 30px rgba(0,0,0,.18)"
        : "0 6px 18px rgba(0,0,0,.08)",
    },
  };
}

function makeEdge(id: string, source: string, target: string, type: string): Edge {
  const accent = RELATION_ACCENT[type] ?? "#74706a";
  return {
    id,
    source,
    target,
    label: type.replaceAll("_", " "),
    markerEnd: { type: MarkerType.ArrowClosed, color: accent },
    style: { stroke: accent, strokeWidth: 1.6 },
    labelStyle: { fill: "var(--muted)", fontSize: 10, fontWeight: 650 },
    labelBgStyle: { fill: "var(--panel)", fillOpacity: 0.92 },
  };
}

export default function DebatePosition({ graph, currentId, basePath }: Props) {
  const position = useMemo(() => {
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    const current = byId.get(currentId);
    if (!current) return { nodes: [] as Node[], edges: [] as Edge[] };

    const incoming = graph.edges.filter((edge) => edge.target === currentId);
    const outgoing = graph.edges.filter((edge) => edge.source === currentId);
    const secondHop = outgoing.flatMap((reply) =>
      graph.edges
        .filter((edge) => edge.source === reply.target)
        .filter((edge) => edge.target !== currentId),
    );

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const placed = new Set<string>();

    const place = (
      id: string,
      column: number,
      row: number,
      totalRows: number,
      isCurrent = false,
    ) => {
      if (placed.has(id)) return;
      const item = byId.get(id);
      if (!item) return;
      const spacingY = 145;
      const y = row * spacingY - ((Math.max(totalRows, 1) - 1) * spacingY) / 2;
      nodes.push(makeNode(item.id, item.title, item.type, column * 315, y, isCurrent));
      placed.add(id);
    };

    place(currentId, 0, 0, 1, true);

    incoming.forEach((edge, index) => {
      place(edge.source, -1, index, incoming.length);
      edges.push(makeEdge(edge.id, edge.source, edge.target, edge.type));
    });

    outgoing.forEach((edge, index) => {
      place(edge.target, 1, index, outgoing.length);
      edges.push(makeEdge(edge.id, edge.source, edge.target, edge.type));
    });

    const counterIds = Array.from(new Set(secondHop.map((edge) => edge.target)));
    counterIds.forEach((id, index) => place(id, 2, index, counterIds.length));

    secondHop.forEach((edge) => {
      if (placed.has(edge.source) && placed.has(edge.target)) {
        edges.push(makeEdge(edge.id, edge.source, edge.target, edge.type));
      }
    });

    return { nodes, edges };
  }, [graph, currentId]);

  return (
    <div className="position-graph">
      <ReactFlow
        nodes={position.nodes}
        edges={position.edges}
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 1.15 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          if (node.id === currentId) return;
          window.location.href = basePath + "node/" + node.id + "/";
        }}
      >
        <Background gap={22} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
