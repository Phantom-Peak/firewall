'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from 'reactflow';

export type DeviceKind = 'NSP' | 'PC' | 'NEs' | 'Syslog';

export const deviceBorderClass: Record<string, string> = {
  NSP: 'node-nsp',
  PC: 'node-pc',
  NEs: 'node-ne',
  Syslog: 'node-sys',
};

/* ================= DEVICE NODE ================= */
export const DeviceNode = memo((props: NodeProps) => {
  const { data } = props;
  const kind: DeviceKind = data.kind ?? 'PC';
  const cls = deviceBorderClass[kind] ?? '';
  const isChild = Boolean(data?.isChild);

  const handlePositions = [Position.Top, Position.Right, Position.Bottom, Position.Left];

  return (
    <div className={`node-device ${cls}`}>
      <div style={{ marginBottom: 6 }}>{data.label ?? kind}</div>

      {!isChild &&
        handlePositions.map((pos) => (
          <div key={pos}>
            <Handle
              type="source"
              position={pos}
              style={{
                background: '#0ea5e9',
                width: 8,
                height: 8,
              }}
              isConnectable={data.connectable !== false}
            />
            <Handle
              type="target"
              position={pos}
              style={{
                width: 8,
                height: 8,
                opacity: 0, // invisible
                pointerEvents: 'none', // không chặn click
              }}
              isConnectable={data.connectable !== false}
            />
          </div>
        ))}
    </div>
  );
});
DeviceNode.displayName = 'DeviceNode';

/* ================= ZONE NODE ================= */
function hexToRgba(hex: string, a = 0.08) {
  const m = hex.replace('#', '');
  const p = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const v = parseInt(p, 16);
  const r = (v >> 16) & 255,
    g = (v >> 8) & 255,
    b = v & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const ZoneNode = memo((props: NodeProps) => {
  const { data, selected } = props;
  const color: string = data?.color ?? '#0ea5e9';
  const W = (data?.w as number) ?? 280;
  const H = (data?.h as number) ?? 180;

  const handlePositions = [
    { position: Position.Top, style: { left: W / 2, top: 0 } },
    { position: Position.Right, style: { left: W, top: H / 2 } },
    { position: Position.Bottom, style: { left: W / 2, top: H } },
    { position: Position.Left, style: { left: 0, top: H / 2 } },
  ];

  return (
    <div
      className={`node-zone ${selected ? 'zone-selected' : ''}`}
      style={{
        borderColor: color,
        background: hexToRgba(color, 0.08),
        width: W,
        height: H,
        position: 'relative',
      }}
    >
      <span className="label" style={{ background: color }}>
        {data?.label ?? 'Zone'}
      </span>

      {/* 4 vị trí có 2 handle: source hiển thị, target ẩn */}
      {handlePositions.map((h, idx) => (
        <div key={idx}>
          <Handle
            type="source"
            position={h.position}
            style={{
              position: 'absolute',
              ...h.style,
              transform: 'translate(-50%, -50%)',
              background: color,
              width: 8,
              height: 8,
            }}
            isConnectable={data.connectable !== false}
          />
          <Handle
            type="target"
            position={h.position}
            style={{
              position: 'absolute',
              ...h.style,
              transform: 'translate(-50%, -50%)',
              width: 8,
              height: 8,
              opacity: 0,
              pointerEvents: 'none',
            }}
            isConnectable={data.connectable !== false}
          />
        </div>
      ))}

      <NodeToolbar isVisible={selected} position={Position.Top} align="center">
        {/* toolbar giữ nguyên */}
      </NodeToolbar>
    </div>
  );
});
ZoneNode.displayName = 'ZoneNode';

export const nodeTypes = {
  device: DeviceNode,
  zone: ZoneNode,
};
