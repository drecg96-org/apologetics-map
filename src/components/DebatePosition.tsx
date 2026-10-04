import { useMemo } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  MarkerType,
  ReactFlow,
  type Edge,
  type EdgeProps,
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

function WrappedPositionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.hypot(dx, dy) || 1;
  const offset = 12;
  const offsetX = (-dy / length) * offset;
  const offsetY = (dx / length) * offset;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {label !== undefined && label !== null && label !== "" && (
        <EdgeLabelRenderer>
          <div
            className="graph-edge-label"
            style={{
              transform:
                `translate(-50%, -50%) translate(${labelX + offsetX}px, ${labelY + offsetY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const POSITION_EDGE_TYPES = { wrapped: WrappedPositionEdge };

function makeEdge(id: string, source: string, target: string, label: string): Edge {
  return {
    id,
    source,
    target,
    label,
    type: "wrapped",
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

export default function DebatePosition({ graph, currentId, basePath }: Props) {
  const position = useMemo(() => {
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    const current = byId.get(currentId);
    if (!current) return { nodes: [] as Node[], edges: [] as Edge[] };

    const incoming = graph.flowEdges
      .filter((edge) => edge.target === currentId)
      .sort((a, b) => a.priority - b.priority);
    const outgoing = graph.flowEdges
      .filter((edge) => edge.source === currentId)
      .sort((a, b) => a.priority - b.priority);

    const secondHop = outgoing.flatMap((reply) =>
      graph.flowEdges
        .filter((edge) => edge.source === reply.target)
        .sort((a, b) => a.priority - b.priority),
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
      edges.push(makeEdge(edge.id, edge.source, edge.target, edge.label));
    });

    outgoing.forEach((edge, index) => {
      place(edge.target, 1, index, outgoing.length);
      edges.push(makeEdge(edge.id, edge.source, edge.target, edge.label));
    });

    const counterIds = Array.from(new Set(secondHop.map((edge) => edge.target)));
    counterIds.forEach((id, index) => place(id, 2, index, counterIds.length));

    secondHop.forEach((edge) => {
      if (placed.has(edge.source) && placed.has(edge.target)) {
        edges.push(makeEdge(edge.id, edge.source, edge.target, edge.label));
      }
    });

    return { nodes, edges };
  }, [graph, currentId]);

  if (position.edges.length === 0) return null;

  return (
    <div className="position-graph">
      <ReactFlow
        nodes={position.nodes}
        edges={position.edges}
        edgeTypes={POSITION_EDGE_TYPES}
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
