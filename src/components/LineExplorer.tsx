import { useEffect, useMemo, useState } from "react";
import type { GraphPayload } from "../lib/graph";

type Props = {
  graph: GraphPayload;
  visibleIds: string[];
  basePath: string;
};

type FlowEdge = GraphPayload["flowEdges"][number];
type GraphNode = GraphPayload["nodes"][number];

function sortEdges(edges: FlowEdge[]) {
  return [...edges].sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label));
}

export default function LineExplorer({ graph, visibleIds, basePath }: Props) {
  const visible = useMemo(() => new Set(visibleIds), [visibleIds]);
  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const flowEdges = useMemo(
    () => sortEdges(
      graph.flowEdges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
    ),
    [graph.flowEdges, visible],
  );

  const topicNodes = useMemo(
    () => graph.nodes.filter((node) =>
      visible.has(node.id) &&
      node.type === "topic"
    ),
    [graph.nodes, visible],
  );

  const debateNodes = useMemo(
    () => graph.nodes.filter((node) =>
      visible.has(node.id) &&
      node.type !== "source" &&
      node.type !== "topic" &&
      node.conversation
    ),
    [graph.nodes, visible],
  );

  const topicEdges = useMemo(() => {
    const edges: FlowEdge[] = [];

    for (const topic of topicNodes) {
      const openings = debateNodes
        .filter((node) =>
          node.conversation?.opening &&
          node.topics.includes(topic.id)
        )
        .sort((a, b) =>
          (a.conversation?.priority ?? 50) - (b.conversation?.priority ?? 50) ||
          a.title.localeCompare(b.title)
        );

      openings.forEach((node, index) => {
        edges.push({
          id: `line-topic--${topic.id}--${node.id}--${index}`,
          source: topic.id,
          target: node.id,
          label: "main question",
          priority: node.conversation?.priority ?? 50,
        });
      });
    }

    return edges;
  }, [topicNodes, debateNodes]);

  const lineNodes = useMemo(
    () => [...topicNodes, ...debateNodes],
    [topicNodes, debateNodes],
  );

  const lineEdges = useMemo(
    () => sortEdges([...topicEdges, ...flowEdges]),
    [topicEdges, flowEdges],
  );

  const incoming = useMemo(() => {
    const map = new Map<string, FlowEdge[]>();
    for (const node of lineNodes) map.set(node.id, []);
    for (const edge of lineEdges) {
      const list = map.get(edge.target) ?? [];
      list.push(edge);
      map.set(edge.target, list);
    }
    return map;
  }, [lineNodes, lineEdges]);

  const outgoing = useMemo(() => {
    const map = new Map<string, FlowEdge[]>();
    for (const node of lineNodes) map.set(node.id, []);
    for (const edge of lineEdges) {
      const list = map.get(edge.source) ?? [];
      list.push(edge);
      map.set(edge.source, list);
    }
    for (const [id, edges] of map) map.set(id, sortEdges(edges));
    return map;
  }, [lineNodes, lineEdges]);

  const roots = useMemo(() => {
    const activeTopics = topicNodes
      .filter((topic) => (outgoing.get(topic.id) ?? []).length > 0)
      .sort((a, b) => a.title.localeCompare(b.title));

    if (activeTopics.length > 0) return activeTopics;

    const explicit = debateNodes
      .filter((node) => node.conversation?.opening)
      .sort((a, b) =>
        (a.conversation?.priority ?? 50) - (b.conversation?.priority ?? 50) ||
        a.title.localeCompare(b.title)
      );
    if (explicit.length > 0) return explicit;

    return lineNodes
      .filter((node) => (incoming.get(node.id) ?? []).length === 0)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [topicNodes, debateNodes, lineNodes, incoming, outgoing]);

  const initialId = roots[0]?.id ?? lineNodes[0]?.id ?? "";

  const [path, setPath] = useState<string[]>(initialId ? [initialId] : []);

  useEffect(() => {
    if (!initialId) {
      setPath([]);
      return;
    }
    const current = path[path.length - 1];
    if (!current || !visible.has(current)) setPath([initialId]);
  }, [initialId, visible, path]);

  const currentId = path[path.length - 1] ?? "";
  const current = byId.get(currentId);
  const responses = currentId ? outgoing.get(currentId) ?? [] : [];
  const terminal = current?.conversation?.terminal;

  const semantic = useMemo(() => {
    if (!currentId) return [];
    return graph.edges
      .filter((edge) => edge.source === currentId || edge.target === currentId)
      .map((edge) => {
        const otherId = edge.source === currentId ? edge.target : edge.source;
        return {
          ...edge,
          direction: edge.source === currentId ? "out" as const : "in" as const,
          node: byId.get(otherId),
        };
      })
      .filter((item) => item.node && item.node.type !== "source")
      .slice(0, 8);
  }, [graph.edges, currentId, byId]);

  function chooseMove(edge: FlowEdge) {
    const existing = path.indexOf(edge.target);
    if (existing >= 0) {
      setPath(path.slice(0, existing + 1));
      return;
    }
    setPath([...path, edge.target]);
  }

  function findPath(target: string): string[] {
    const queue = roots.map((root) => [root.id]);
    const seen = new Set<string>();

    while (queue.length > 0) {
      const candidate = queue.shift()!;
      const id = candidate[candidate.length - 1];
      if (id === target) return candidate;
      if (seen.has(id)) continue;
      seen.add(id);

      for (const edge of outgoing.get(id) ?? []) {
        if (!candidate.includes(edge.target)) queue.push([...candidate, edge.target]);
      }
    }

    return [target];
  }

  function jumpTo(id: string) {
    setPath(findPath(id));
  }

  function OutlineBranch({
    node,
    depth,
    ancestors,
  }: {
    node: GraphNode;
    depth: number;
    ancestors: Set<string>;
  }) {
    const children = (outgoing.get(node.id) ?? [])
      .map((edge) => ({ edge, node: byId.get(edge.target) }))
      .filter((item): item is { edge: FlowEdge; node: GraphNode } => Boolean(item.node));

    const active = currentId === node.id;
    const inPath = path.includes(node.id);

    if (ancestors.has(node.id)) {
      return (
        <button
          type="button"
          className="line-tree-jump transposition"
          onClick={() => jumpTo(node.id)}
        >
          <span>↪ transposition</span>
          <strong>{node.title}</strong>
        </button>
      );
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(node.id);

    if (children.length === 0) {
      return (
        <button
          type="button"
          className={"line-tree-jump" + (active ? " active" : "")}
          onClick={() => jumpTo(node.id)}
        >
          <span>
            {node.conversation?.terminal
              ? "endpoint · " + node.conversation.terminal.kind.replaceAll("-", " ")
              : node.type}
          </span>
          <strong>{node.title}</strong>
        </button>
      );
    }

    return (
      <details className="line-tree-branch" open={depth === 0 || inPath}>
        <summary>
          <button
            type="button"
            className={"line-tree-jump" + (active ? " active" : "")}
            onClick={(event) => {
              event.preventDefault();
              jumpTo(node.id);
            }}
          >
            <span>{node.type}</span>
            <strong>{node.title}</strong>
          </button>
        </summary>
        <div className="line-tree-children">
          {children.map(({ edge, node: child }) => (
            <div className="line-tree-child" key={edge.id}>
              <span className="line-tree-edge">{edge.label}</span>
              <OutlineBranch node={child} depth={depth + 1} ancestors={nextAncestors} />
            </div>
          ))}
        </div>
      </details>
    );
  }

  if (!current) {
    return (
      <div className="line-explorer-empty">
        No debate-line nodes match the current filters.
      </div>
    );
  }

  return (
    <div className="line-explorer">
      <aside className="line-outline" aria-label="Debate outline">
        <div className="line-outline-head">
          <span>Full debate</span>
          <strong>{lineNodes.length} mapped notes</strong>
        </div>
        <div className="line-tree">
          {roots.map((root) => (
            <OutlineBranch
              key={root.id}
              node={root}
              depth={0}
              ancestors={new Set()}
            />
          ))}
        </div>
      </aside>

      <section className="line-stage">
        <nav className="line-history" aria-label="Current debate line">
          {path.map((id, index) => {
            const node = byId.get(id);
            if (!node) return null;
            return (
              <button
                key={id + index}
                type="button"
                onClick={() => setPath(path.slice(0, index + 1))}
              >
                <span>{index + 1}</span>
                {node.title}
              </button>
            );
          })}
        </nav>

        <article className="line-current">
          <div className="line-current-head">
            <span className={"type-badge type-" + current.type}>{current.type}</span>
            <span className="line-move-number">{current.type === "topic" ? "Start here" : `Position ${path.length - 1}`}</span>
          </div>
          <h3>{current.title}</h3>
          {current.summary && <p>{current.summary}</p>}
          <div className="line-current-actions">
            <a href={basePath + "node/" + current.id + "/"}>Open full reference →</a>
          </div>
        </article>

        <section className="line-responses">
          <div className="line-section-head">
            <div>
              <span className="line-kicker">{terminal && responses.length === 0 ? "Line outcome" : "Next moves"}</span>
              <h4>
                {responses.length
                  ? "Common responses"
                  : terminal?.label ?? "End of this mapped line"}
              </h4>
            </div>
            {responses.length > 0 && <span>{responses.length} choices</span>}
          </div>

          {responses.length > 0 ? (
            <div className="line-response-list">
              {responses.map((edge, index) => {
                const node = byId.get(edge.target);
                if (!node) return null;
                return (
                  <button
                    type="button"
                    className="line-response-card"
                    onClick={() => chooseMove(edge)}
                    key={edge.id}
                  >
                    <span className="line-response-index">{index + 1}</span>
                    <span className="line-response-copy">
                      <small>{edge.label} · {node.type}</small>
                      <strong>{node.title}</strong>
                      {node.summary && <em>{node.summary}</em>}
                    </span>
                    <span className="line-response-arrow">→</span>
                  </button>
                );
              })}
            </div>
          ) : terminal ? (
            <div className={"line-terminal line-terminal-" + terminal.kind}>
              <span className="line-terminal-kind">
                {terminal.kind.replaceAll("-", " ")}
              </span>
              <strong>{terminal.label ?? "Intentional endpoint"}</strong>
              {terminal.note && <p>{terminal.note}</p>}
            </div>
          ) : (
            <p className="line-empty-copy">
              This branch currently has no mapped conversational continuation. You can jump
              elsewhere from the debate outline or open the full reference page.
            </p>
          )}
        </section>

        {semantic.length > 0 && (
          <section className="line-context">
            <div className="line-section-head">
              <div>
                <span className="line-kicker">Under the hood</span>
                <h4>Semantic context</h4>
              </div>
            </div>
            <div className="line-context-grid">
              {semantic.map((item) => (
                <a
                  key={item.id}
                  href={basePath + "node/" + item.node!.id + "/"}
                  className="line-context-card"
                >
                  <span>
                    {item.direction === "out"
                      ? item.type.replaceAll("_", " ")
                      : item.type.replaceAll("_", " ") + " from"}
                  </span>
                  <strong>{item.node!.title}</strong>
                </a>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
