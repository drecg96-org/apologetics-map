import { useEffect, useMemo, useRef, useState } from "react";
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
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const initializedFromUrl = useRef(false);

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

  function writePathToUrl(nextPath: string[], replace = false) {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const current = nextPath[nextPath.length - 1];

    if (current) url.searchParams.set("node", current);
    else url.searchParams.delete("node");

    if (nextPath.length > 1) url.searchParams.set("path", nextPath.join(","));
    else url.searchParams.delete("path");

    if (replace) window.history.replaceState({}, "", url);
    else window.history.pushState({}, "", url);
  }

  function commitPath(nextPath: string[], replace = false) {
    setPath(nextPath);
    writePathToUrl(nextPath, replace);
  }

  function chooseMove(edge: FlowEdge) {
    const existing = path.indexOf(edge.target);
    if (existing >= 0) {
      commitPath(path.slice(0, existing + 1));
      return;
    }
    commitPath([...path, edge.target]);
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

  function pathFromUrl(): string[] {
    if (typeof window === "undefined") return initialId ? [initialId] : [];

    const params = new URL(window.location.href).searchParams;
    const target = params.get("node");
    const serialized = params.get("path");

    if (serialized) {
      const candidate = serialized.split(",").filter(Boolean);
      const allVisible = candidate.length > 0 && candidate.every((id) => visible.has(id));
      const connected = candidate.every((id, index) =>
        index === 0 ||
        lineEdges.some((edge) => edge.source === candidate[index - 1] && edge.target === id)
      );
      const matchesTarget = !target || candidate[candidate.length - 1] === target;

      if (allVisible && connected && matchesTarget) return candidate;
    }

    if (target && visible.has(target)) return findPath(target);
    return initialId ? [initialId] : [];
  }

  useEffect(() => {
    if (!initialId || initializedFromUrl.current) return;
    initializedFromUrl.current = true;
    setPath(pathFromUrl());
  }, [initialId, lineEdges, roots, visible]);

  useEffect(() => {
    if (!initializedFromUrl.current || !initialId) return;
    const current = path[path.length - 1];
    if (!current || !visible.has(current)) commitPath([initialId], true);
  }, [initialId, visible, path]);

  useEffect(() => {
    const handlePopState = () => {
      if (!initializedFromUrl.current) return;
      setPath(pathFromUrl());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [initialId, lineEdges, roots, visible]);

  function jumpTo(id: string) {
    commitPath(findPath(id));
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
    const branchOpen = depth === 0 || inPath || expandedBranches.has(node.id);

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
      <details
        className="line-tree-branch"
        open={branchOpen}
        onToggle={(event) => {
          if (depth === 0 || inPath) return;
          const isOpen = event.currentTarget.open;
          setExpandedBranches((current) => {
            const next = new Set(current);
            if (isOpen) next.add(node.id);
            else next.delete(node.id);
            return next;
          });
        }}
      >
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
        {branchOpen && (
          <div className="line-tree-children">
            {children.map(({ edge, node: child }) => (
              <div className="line-tree-child" key={edge.id}>
                <span className="line-tree-edge">{edge.label}</span>
                <OutlineBranch node={child} depth={depth + 1} ancestors={nextAncestors} />
              </div>
            ))}
          </div>
        )}
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
          <span>Debate structure</span>
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
                onClick={() => commitPath(path.slice(0, index + 1))}
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
            <a href={current.type === "topic"
              ? basePath + "topic/" + current.id + "/"
              : basePath + "node/" + current.id + "/"}>
              {current.type === "topic" ? "Open topic →" : "Open full reference →"}
            </a>
          </div>
        </article>

        {current.crux && (
          <section className="line-crux" aria-label="Key crux">
            <div className="line-section-head">
              <div>
                <span className="line-kicker">Key crux</span>
                <h4>{current.crux.question}</h4>
              </div>
              <span>{current.crux.positions.length} live positions</span>
            </div>
            {current.crux.note && <p className="line-crux-note">{current.crux.note}</p>}
            <div className="line-crux-positions">
              {current.crux.positions.map((position) => {
                const positionNode = byId.get(position.node);
                if (!positionNode) return null;
                return (
                  <a
                    key={position.node}
                    href={basePath + "node/" + position.node + "/"}
                    className="line-crux-position"
                  >
                    <small>{position.label}</small>
                    <strong>{positionNode.title}</strong>
                    {position.note && <span>{position.note}</span>}
                  </a>
                );
              })}
            </div>
            {current.crux.deciding_evidence.length > 0 && (
              <div className="line-crux-evidence">
                <strong>What would move this?</strong>
                <ul>
                  {current.crux.deciding_evidence.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="line-responses">
          <div className="line-section-head">
            <div>
              <span className="line-kicker">
                {terminal && responses.length === 0
                  ? "Line outcome"
                  : current.type === "topic"
                    ? "Start with a question"
                    : "Next moves"}
              </span>
              <h4>
                {responses.length
                  ? current.type === "topic"
                    ? "Main questions"
                    : "Common responses"
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
