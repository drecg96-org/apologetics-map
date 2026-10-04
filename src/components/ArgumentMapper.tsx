import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type ArgumentStatement = {
  id: string;
  nodeId: string;
  title: string;
  summary?: string;
  role: "premise" | "intermediate-conclusion" | "conclusion";
  label?: string;
  note?: string;
  scholarship?: string;
  sourceCount: number;
  supportCount: number;
  challengeCount: number;
};

type InferenceChallenge = {
  nodeId: string;
  title: string;
  summary?: string;
  note?: string;
};

type ArgumentInference = {
  id: string;
  from: string[];
  to: string;
  kind: string;
  label?: string;
  note?: string;
  challenges: InferenceChallenge[];
};

type Props = {
  form: string;
  statements: ArgumentStatement[];
  inferences: ArgumentInference[];
  basePath: string;
};

const ROLE_ACCENT: Record<ArgumentStatement["role"], string> = {
  premise: "#2f6f70",
  "intermediate-conclusion": "#8a5a17",
  conclusion: "#246b4b",
};

function roleLabel(role: ArgumentStatement["role"]) {
  return role.replace("-", " ");
}

export default function ArgumentMapper({
  form,
  statements,
  inferences,
  basePath,
}: Props) {
  const graph = useMemo(() => {
    const statementById = new Map(statements.map((statement) => [statement.id, statement]));
    const statementDepth = new Map(statements.map((statement) => [statement.id, 0]));
    const inferenceDepth = new Map<string, number>();

    for (let pass = 0; pass < Math.max(2, statements.length * 2); pass += 1) {
      let changed = false;
      for (const inference of inferences) {
        const fromDepth = Math.max(...inference.from.map((id) => statementDepth.get(id) ?? 0));
        const nextInferenceDepth = fromDepth + 1;
        const nextTargetDepth = nextInferenceDepth + 1;

        if ((inferenceDepth.get(inference.id) ?? -1) < nextInferenceDepth) {
          inferenceDepth.set(inference.id, nextInferenceDepth);
          changed = true;
        }
        if ((statementDepth.get(inference.to) ?? 0) < nextTargetDepth) {
          statementDepth.set(inference.to, nextTargetDepth);
          changed = true;
        }
      }
      if (!changed) break;
    }

    const layoutItems: Array<{
      key: string;
      depth: number;
      node: Node;
    }> = [];

    for (const statement of statements) {
      const accent = ROLE_ACCENT[statement.role];
      layoutItems.push({
        key: `statement-${statement.id}`,
        depth: statementDepth.get(statement.id) ?? 0,
        node: {
          id: `statement-${statement.id}`,
          position: { x: 0, y: 0 },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            label: (
              <div className="argument-statement-label">
                <div className="argument-statement-kicker">
                  <span>{statement.label ?? statement.id.toUpperCase()}</span>
                  <span>{roleLabel(statement.role)}</span>
                </div>
                <strong>{statement.title}</strong>
                <div className="argument-statement-meta">
                  {statement.scholarship && <span>{statement.scholarship}</span>}
                  <span>{statement.sourceCount} sources</span>
                  <span>{statement.supportCount} linked supports</span>
                  <span>{statement.challengeCount} linked challenges</span>
                </div>
              </div>
            ),
          },
          style: {
            width: 250,
            padding: 0,
            borderRadius: 12,
            border: `2px solid ${accent}`,
            background: "var(--panel)",
            color: "var(--text)",
            boxShadow: "0 6px 18px rgba(0,0,0,.09)",
          },
        },
      });
    }

    for (const inference of inferences) {
      layoutItems.push({
        key: `inference-${inference.id}`,
        depth: inferenceDepth.get(inference.id) ?? 1,
        node: {
          id: `inference-${inference.id}`,
          position: { x: 0, y: 0 },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            label: (
              <div className="argument-inference-label">
                <span>{inference.kind}</span>
                <strong>{inference.label ?? "inference"}</strong>
                {inference.challenges.length > 0 && (
                  <em>{inference.challenges.length} inference challenge{inference.challenges.length === 1 ? "" : "s"}</em>
                )}
              </div>
            ),
          },
          style: {
            width: 170,
            padding: 0,
            borderRadius: 999,
            border: "1px dashed var(--muted)",
            background: "var(--bg)",
            color: "var(--text)",
          },
        },
      });
    }

    const byDepth = new Map<number, typeof layoutItems>();
    for (const item of layoutItems) {
      const items = byDepth.get(item.depth) ?? [];
      items.push(item);
      byDepth.set(item.depth, items);
    }

    const xSpacing = 330;
    const ySpacing = 165;
    const nodes: Node[] = [];
    for (const [depth, items] of Array.from(byDepth.entries()).sort((a, b) => a[0] - b[0])) {
      items.forEach((item, index) => {
        const y = index * ySpacing - ((items.length - 1) * ySpacing) / 2;
        nodes.push({
          ...item.node,
          position: { x: depth * xSpacing, y },
        });
      });
    }

    const edges: Edge[] = [];
    for (const inference of inferences) {
      for (const source of inference.from) {
        if (!statementById.has(source)) continue;
        edges.push({
          id: `${inference.id}-from-${source}`,
          source: `statement-${source}`,
          target: `inference-${inference.id}`,
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
          style: { stroke: "var(--accent)", strokeWidth: 1.8 },
        });
      }
      if (statementById.has(inference.to)) {
        edges.push({
          id: `${inference.id}-to-${inference.to}`,
          source: `inference-${inference.id}`,
          target: `statement-${inference.to}`,
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
          style: { stroke: "var(--accent)", strokeWidth: 1.8 },
        });
      }
    }

    return { nodes, edges };
  }, [inferences, statements]);

  return (
    <div className="argument-mapper-shell">
      <div className="argument-mapper-head">
        <span>{form} argument</span>
        <span>Tap any proposition to inspect its evidence and objections.</span>
      </div>
      <div className="argument-mapper-canvas">
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1.15 }}
          minZoom={0.25}
          maxZoom={1.7}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, node) => {
            if (node.id.startsWith("statement-")) {
              const localId = node.id.slice("statement-".length);
              const statement = statements.find((candidate) => candidate.id === localId);
              if (!statement) return;
              window.location.href = basePath + "node/" + statement.nodeId + "/";
              return;
            }
            if (node.id.startsWith("inference-")) {
              const localId = node.id.slice("inference-".length);
              document.getElementById("inference-challenges-" + localId)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }}
        >
          <Background gap={22} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="argument-statement-list">
        {statements.map((statement) => (
          <a key={statement.id} href={basePath + "node/" + statement.nodeId + "/"}>
            <span>{statement.label ?? statement.id.toUpperCase()} · {roleLabel(statement.role)}</span>
            <strong>{statement.title}</strong>
            {statement.note && <p>{statement.note}</p>}
          </a>
        ))}
      </div>
      {inferences.some((inference) => inference.challenges.length > 0) && (
        <div className="argument-inference-challenges">
          {inferences
            .filter((inference) => inference.challenges.length > 0)
            .map((inference) => (
              <section key={inference.id} id={"inference-challenges-" + inference.id}>
                <div className="argument-inference-challenge-heading">
                  <span>{inference.id.toUpperCase()} · inference challenge</span>
                  <strong>{inference.label ?? inference.kind}</strong>
                  {inference.note && <p>{inference.note}</p>}
                </div>
                <div className="argument-inference-challenge-cards">
                  {inference.challenges.map((challenge) => (
                    <a key={challenge.nodeId} href={basePath + "node/" + challenge.nodeId + "/"}>
                      <span>Objection to inference</span>
                      <strong>{challenge.title}</strong>
                      {challenge.note && <p>{challenge.note}</p>}
                      {!challenge.note && challenge.summary && <p>{challenge.summary}</p>}
                    </a>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
