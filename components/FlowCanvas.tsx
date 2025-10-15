'use client';

import 'reactflow/dist/style.css';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ConnectionLineType,
} from 'reactflow';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nodeTypes } from './nodeTypes';
import { Palette } from './Palette';

type PalettePayload = { id: string; label: string; kind: 'NSP' | 'PCs' | 'NEs' | 'Syslog' };

let nodeId = 1;
const genId = () => `n-${nodeId++}`;

function getZoneUnderPoint(nodes: Node[], x: number, y: number): Node | undefined {
  return nodes.find((n) => {
    if (n.type !== 'zone') return false;
    const w = (n.style?.width as number) || 280;
    const h = (n.style?.height as number) || 180;
    return x >= n.position.x && x <= n.position.x + w &&
           y >= n.position.y && y <= n.position.y + h;
  });
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export default function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [projectName, setProjectName] = useState('');
  const rf = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* -------------------- History (undo/redo) -------------------- */
  type FlowState = { nodes: Node[]; edges: Edge[] };
  const past = useRef<FlowState[]>([]);
  const future = useRef<FlowState[]>([]);

  const snapshot = useCallback(() => {
    const snap: FlowState = {
      nodes: JSON.parse(JSON.stringify(rf.getNodes())),
      edges: JSON.parse(JSON.stringify(rf.getEdges())),
    };
    past.current.push(snap);
    future.current.length = 0;
  }, [rf]);

  const applyState = useCallback((st: FlowState) => {
    setNodes(st.nodes);
    setEdges(st.edges);
  }, [setNodes, setEdges]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const current: FlowState = {
      nodes: JSON.parse(JSON.stringify(rf.getNodes())),
      edges: JSON.parse(JSON.stringify(rf.getEdges())),
    };
    const prev = past.current.pop()!;
    future.current.push(current);
    applyState(prev);
  }, [applyState, rf]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const current: FlowState = {
      nodes: JSON.parse(JSON.stringify(rf.getNodes())),
      edges: JSON.parse(JSON.stringify(rf.getEdges())),
    };
    const next = future.current.pop()!;
    past.current.push(current);
    applyState(next);
  }, [applyState, rf]);

  useEffect(() => { snapshot(); }, [snapshot]);

  /* -------------------- Zone rename / color -------------------- */
  const patchZone = useCallback((id: string, patch: Record<string, any>) => {
    snapshot();
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, [setNodes, snapshot]);

  const onChangeZoneLabel = useCallback((id: string, label: string) => {
    patchZone(id, { label });
  }, [patchZone]);

  const onChangeZoneColor = useCallback((id: string, color: string) => {
    patchZone(id, { color });
  }, [patchZone]);

  // Resize a zone by setting its width/height in both data and style (undoable)
    const onResizeZone = useCallback((id: string, w: number, h: number) => {
    snapshot();
    setNodes((nds) =>
        nds.map((n) =>
        n.id === id && n.type === 'zone'
            ? {
                ...n,
                data: { ...n.data, w, h },
                style: { ...(n.style || {}), width: w, height: h },
            }
            : n
        )
    );
    }, [setNodes, snapshot]);


  /* -------------------- Canvas ops -------------------- */
  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    snapshot();

    const e: Edge = {
      id: `e-${crypto.randomUUID()}`,
      source: c.source,
      target: c.target,
      type: 'straight',
      animated: false,
      style: { strokeWidth: 2 },
    };

    setEdges((eds) => addEdge(e, eds));
}, [setEdges, snapshot]);


  const onDragOver = useCallback((evt: React.DragEvent) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((evt: React.DragEvent) => {
    evt.preventDefault();
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const dataRaw = evt.dataTransfer.getData('application/reactflow');
    if (!dataRaw) return;

    const payload: PalettePayload = JSON.parse(dataRaw);
    const position = rf.project({ x: evt.clientX - bounds.left, y: evt.clientY - bounds.top });

    const zone = getZoneUnderPoint(rf.getNodes(), position.x, position.y);
    const label = payload.kind === 'PCs' ? 'PC' : payload.kind;

    snapshot();

    const inside = Boolean(zone);
    const node: Node = inside ? {
      id: genId(),
      type: 'device',
      data: { label, kind: label, isChild: true, connectable: true },
      parentNode: zone!.id,
      extent: 'parent',
      position: { x: position.x - zone!.position.x, y: position.y - zone!.position.y },
    } : {
      id: genId(),
      type: 'device',
      data: { label, kind: label, isChild: false, connectable: true },
      position,
    };

    setNodes((nds) => nds.concat(node));
  }, [rf, setNodes, snapshot, onChangeZoneLabel, onChangeZoneColor, onResizeZone]);

  const addZone = useCallback(() => {
    const pt = rf.project({ x: 420, y: 220 });
    const id = genId();
    const w = 280, h = 180;
    snapshot();
    const zone: Node = {
      id,
      type: 'zone',
      position: { x: pt.x, y: pt.y },
      data: {
        label: `Z${id.split('-')[1]}`,
        color: '#0ea5e9',
        handleCount: 8,
        w, h,
        onChangeLabel: onChangeZoneLabel,
        onChangeColor: onChangeZoneColor,
        onResize: onResizeZone,
        connectable: true, // Đưa vào data
      },
      style: { width: w, height: h, zIndex: 0 },
      selectable: true,
      draggable: true,
    };
    setNodes((nds) => nds.concat(zone));
  }, [rf, setNodes, snapshot, onChangeZoneLabel, onChangeZoneColor]);

  /* -------------------- Delete selected -------------------- */
  const deleteSelected = useCallback(() => {
    const Ns = rf.getNodes();
    const Es = rf.getEdges();
    const selectedNodeIds = new Set(Ns.filter(n => n.selected).map(n => n.id));
    const keepNodes = Ns.filter(n => !selectedNodeIds.has(n.id));
    const keepEdges = Es.filter(e =>
      !e.selected &&
      !selectedNodeIds.has(e.source) &&
      !selectedNodeIds.has(e.target)
    );
    if (keepNodes.length === Ns.length && keepEdges.length === Es.length) return;
    snapshot();
    setNodes(keepNodes);
    setEdges(keepEdges);
  }, [rf, setNodes, setEdges, snapshot]);

  /* -------------------- Generate/Clear firewalls -------------------- */
  const generateFirewalls = useCallback(() => {
    snapshot();
    const nodeMap = new Map(rf.getNodes().map(n => [n.id, n]));
    setEdges((eds) =>
      eds.map((e) => {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);onConnect 
        const zoneToZone = a?.type === 'zone' && b?.type === 'zone';
        return zoneToZone
          ? {
              ...e,
              label: '🔥',               // fire icon at edge center
              className: 'edge-firewall',
              labelStyle: { fontSize: 18 },
              labelBgPadding: [4, 2],
              labelBgBorderRadius: 6,
            }
          : { ...e, label: undefined, className: undefined };
      })
    );
  }, [rf, setEdges, snapshot]);

  const clearFirewalls = useCallback(() => {
    snapshot();
    setEdges((eds) => eds.map((e) => ({ ...e, label: undefined, className: undefined })));
  }, [setEdges, snapshot]);

  /* -------------------- Keyboard shortcuts -------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      if ((e.ctrlKey || e.metaKey) &&
          (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault(); redo(); return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); deleteSelected(); return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, deleteSelected]);

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <strong>Firewall rules generator</strong>
        <span>Project name:</span>
        <input
          placeholder="Enter project name..."
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={undo} title="Undo (Ctrl/Cmd+Z)">Undo</button>
          <button onClick={redo} title="Redo (Ctrl/Cmd+Y)">Redo</button>
          <button onClick={deleteSelected} title="Delete (Del/Backspace)">Delete</button>
          <button onClick={generateFirewalls} title="Add 🔥 on zone↔zone edges">Generate Firewalls</button>
          <button onClick={clearFirewalls} title="Remove 🔥 labels">Clear</button>
        </div>
      </div>

      {/* Sidebar */}
      <Palette onAddZone={addZone} />

      {/* Canvas */}
      <div className="canvas" ref={wrapperRef}>
        <div className="rf-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}   
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{
              type: 'straight',
              animated: false,
              style: { strokeWidth: 2 },
            }}
            connectionLineType={ConnectionLineType.Straight}
            connectionLineStyle={{ strokeWidth: 2, opacity: 0.7 }}
            snapToGrid
            snapGrid={[10, 10]}
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
