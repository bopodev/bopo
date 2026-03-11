import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentAvatar } from "@/components/agent-avatar";
import { agentAvatarSeed } from "@/lib/agent-avatar";
import styles from "./org-chart.module.scss";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

interface AgentNode {
  id: string;
  name: string;
  avatarSeed?: string | null;
  role: string;
  managerAgentId: string | null;
  status: string;
  providerType: string;
}

interface OrgNode {
  agent: AgentNode;
  reports: OrgNode[];
}

interface LayoutNode {
  agent: AgentNode;
  x: number;
  y: number;
  children: LayoutNode[];
}

const CARD_W = 220;
const CARD_H = 100;
const GAP_X = 30;
const GAP_Y = 80;
const PADDING = 60;

function buildOrgForest(agents: AgentNode[]): OrgNode[] {
  if (agents.length === 0) {
    return [];
  }

  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
  const childrenByManager = new Map<string | null, AgentNode[]>();

  for (const agent of agents) {
    const key = agent.managerAgentId;
    const current = childrenByManager.get(key) ?? [];
    current.push(agent);
    childrenByManager.set(key, current);
  }

  for (const values of childrenByManager.values()) {
    values.sort((a, b) => a.name.localeCompare(b.name));
  }

  const rootAgents = agents
    .filter((agent) => !agent.managerAgentId || !agentsById.has(agent.managerAgentId))
    .sort((a, b) => a.name.localeCompare(b.name));

  const visited = new Set<string>();

  function buildNode(agent: AgentNode, chain: Set<string>): OrgNode {
    if (chain.has(agent.id)) {
      return { agent, reports: [] };
    }
    visited.add(agent.id);
    const nextChain = new Set(chain);
    nextChain.add(agent.id);
    const directReports = childrenByManager.get(agent.id) ?? [];
    return {
      agent,
      reports: directReports.map((report) => buildNode(report, nextChain))
    };
  }

  const roots = rootAgents.map((root) => buildNode(root, new Set()));
  const detached = agents
    .filter((agent) => !visited.has(agent.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((agent) => buildNode(agent, new Set()));

  return roots.concat(detached);
}

function subtreeWidth(node: OrgNode): number {
  if (node.reports.length === 0) {
    return CARD_W;
  }
  const childrenWidth = node.reports.reduce((sum, report) => sum + subtreeWidth(report), 0);
  const gaps = (node.reports.length - 1) * GAP_X;
  return Math.max(CARD_W, childrenWidth + gaps);
}

function layoutTree(node: OrgNode, x: number, y: number): LayoutNode {
  const totalWidth = subtreeWidth(node);
  const children: LayoutNode[] = [];

  if (node.reports.length > 0) {
    const childrenWidth = node.reports.reduce((sum, report) => sum + subtreeWidth(report), 0);
    const gaps = (node.reports.length - 1) * GAP_X;
    let childX = x + (totalWidth - childrenWidth - gaps) / 2;

    for (const report of node.reports) {
      const reportWidth = subtreeWidth(report);
      children.push(layoutTree(report, childX, y + CARD_H + GAP_Y));
      childX += reportWidth + GAP_X;
    }
  }

  return {
    agent: node.agent,
    x: x + (totalWidth - CARD_W) / 2,
    y,
    children
  };
}

function layoutForest(roots: OrgNode[]): LayoutNode[] {
  if (roots.length === 0) {
    return [];
  }
  let x = PADDING;
  const y = PADDING;
  const layout: LayoutNode[] = [];
  for (const root of roots) {
    const width = subtreeWidth(root);
    layout.push(layoutTree(root, x, y));
    x += width + GAP_X;
  }
  return layout;
}

function flattenNodes(layout: LayoutNode[]): LayoutNode[] {
  const allNodes: LayoutNode[] = [];
  function walk(node: LayoutNode) {
    allNodes.push(node);
    node.children.forEach(walk);
  }
  layout.forEach(walk);
  return allNodes;
}

function collectEdges(layout: LayoutNode[]) {
  const edges: Array<{ parent: LayoutNode; child: LayoutNode }> = [];
  function walk(node: LayoutNode) {
    for (const child of node.children) {
      edges.push({ parent: node, child });
      walk(child);
    }
  }
  layout.forEach(walk);
  return edges;
}

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

export function OrgChart({ agents }: { agents: AgentNode[] }) {
  const roots = useMemo(() => buildOrgForest(agents), [agents]);
  const layout = useMemo(() => layoutForest(roots), [roots]);
  const allNodes = useMemo(() => flattenNodes(layout), [layout]);
  const edges = useMemo(() => collectEdges(layout), [layout]);

  const bounds = useMemo(() => {
    if (allNodes.length === 0) {
      return { width: 800, height: 520 };
    }
    let maxX = 0;
    let maxY = 0;
    for (const node of allNodes) {
      maxX = Math.max(maxX, node.x + CARD_W);
      maxY = Math.max(maxY, node.y + CARD_H);
    }
    return { width: maxX + PADDING, height: maxY + PADDING };
  }, [allNodes]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasInitialized = useRef(false);

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const scaleX = (viewportWidth - 40) / bounds.width;
    const scaleY = (viewportHeight - 40) / bounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    const chartWidth = bounds.width * fitZoom;
    const chartHeight = bounds.height * fitZoom;
    setZoom(fitZoom);
    setPan({
      x: (viewportWidth - chartWidth) / 2,
      y: (viewportHeight - chartHeight) / 2
    });
  }, [bounds.height, bounds.width]);

  useEffect(() => {
    if (allNodes.length === 0) {
      hasInitialized.current = false;
      return;
    }
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;
    fitToView();
  }, [allNodes.length, fitToView]);

  const onMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("[data-org-card]")) {
        return;
      }
      setDragging(true);
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y
      };
    },
    [pan.x, pan.y]
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!dragging) {
        return;
      }
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + deltaX,
        y: dragStartRef.current.panY + deltaY
      });
    },
    [dragging]
  );

  const stopDragging = useCallback(() => {
    setDragging(false);
  }, []);

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }
      const rect = viewport.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      const nextZoom = Math.min(Math.max(zoom * factor, 0.2), 2);
      const scale = nextZoom / zoom;
      setPan({
        x: mouseX - scale * (mouseX - pan.x),
        y: mouseY - scale * (mouseY - pan.y)
      });
      setZoom(nextZoom);
    },
    [pan.x, pan.y, zoom]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;
      const nextZoom = Math.min(Math.max(zoom * factor, 0.2), 2);
      if (viewport) {
        const centerX = viewport.clientWidth / 2;
        const centerY = viewport.clientHeight / 2;
        const scale = nextZoom / zoom;
        setPan({
          x: centerX - scale * (centerX - pan.x),
          y: centerY - scale * (centerY - pan.y)
        });
      }
      setZoom(nextZoom);
    },
    [pan.x, pan.y, zoom]
  );

  return (
    <>

{allNodes.length === 0 ? (
          <div className={styles.emptyState}>No agents yet. Create a CEO or lead role first.</div>
        ) : (
          <div
            ref={viewportRef}
            className={styles.viewport}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            onWheel={onWheel}
          >
            <div className={styles.controls}>
              <button type="button" className={styles.controlButton} onClick={() => zoomBy(1.2)} aria-label="Zoom in">
                +
              </button>
              <button type="button" className={styles.controlButton} onClick={() => zoomBy(0.8)} aria-label="Zoom out">
                -
              </button>
              <button type="button" className={styles.controlButton} onClick={fitToView}>
                Fit
              </button>
            </div>
            <div
              className={styles.chartLayer}
              style={{
                width: `${bounds.width}px`,
                height: `${bounds.height}px`,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
              }}
            >
              <svg className={styles.edgeLayer} width={bounds.width} height={bounds.height}>
                {edges.map(({ parent, child }) => {
                  const x1 = parent.x + CARD_W / 2;
                  const y1 = parent.y + CARD_H;
                  const x2 = child.x + CARD_W / 2;
                  const y2 = child.y;
                  const midY = (y1 + y2) / 2;
                  return (
                    <path
                      key={`${parent.agent.id}-${child.agent.id}`}
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      className={styles.edgePath}
                    />
                  );
                })}
              </svg>
              {allNodes.map((node) => (
                <div
                  key={node.agent.id}
                  data-org-card
                  className={styles.orgCard}
                  style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${CARD_W}px`, height: `${CARD_H}px` }}
                >
                  <div className={styles.orgCardHeader}>
                    <AgentAvatar
                      seed={agentAvatarSeed(node.agent.id, node.agent.name, node.agent.avatarSeed)}
                      name={node.agent.name}
                      className={styles.orgCardAvatar}
                      size={96}
                    />
                    <div className={styles.orgCardText}>
                      <div className={styles.orgCardName}>{node.agent.name}</div>
                      <div className={styles.orgCardMeta}>{formatRole(node.agent.role)}</div>
                      <div className={styles.orgCardDetails}>
                        {node.agent.providerType} · {node.agent.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </>
  );
}
