'use client';

import { useMemo, useState } from 'react';
import yaml from 'js-yaml';

type PaletteItem = { [key: string]: any };

export function Palette({ onAddZone }: { onAddZone: () => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<PaletteItem[]>([
    { id: 'NSP', label: 'NSP', kind: 'NSP' },
    { id: 'PCs', label: 'PCs', kind: 'PCs' },
    { id: 'NEs', label: 'NEs', kind: 'NEs' },
    { id: 'Syslog', label: 'Syslog', kind: 'Syslog' },
  ]);

  // Lọc theo search trên tất cả giá trị
  const filteredItems = useMemo(
    () =>
      items.filter(i =>
        Object.values(i)
          .join(' ')
          .toLowerCase()
          .includes(q.toLowerCase())
      ),
    [q, items]
  );

  // Xử lý upload file YAML
  const onYamlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = yaml.load(evt.target?.result as string);
        if (Array.isArray(data)) {
          setItems(data as PaletteItem[]);
        } else {
          alert('YAML phải là một mảng các item');
        }
      } catch (err) {
        alert('Lỗi đọc YAML: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const onDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="sidebar">
      <h3>Components</h3>
      <input
        placeholder="Search..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div style={{ margin: '8px 0' }}>
        <input type="file" accept=".yaml,.yml" onChange={onYamlUpload} />
      </div>
      <div className="palette">
  {filteredItems.map((it, idx) => (
    <div
      key={it.id ?? idx}
      className="palette-item"
      draggable
      onDragStart={(e) => onDragStart(e, it)}
      title="Drag to canvas"
    >
      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
        {it.label ?? '[No label]'}
      </div>
      <div style={{ fontSize: '12px', color: '#888' }}>
        {Object.entries(it)
          .filter(([k]) => k !== 'label')
          .map(([k, v]) => (
            <div key={k}>
              <strong>{k}:</strong> {String(v)}
            </div>
          ))}
      </div>
    </div>
  ))}
</div>

      <button className="zone-button" onClick={onAddZone}>
        + Add zone
      </button>
    </div>
  );
}