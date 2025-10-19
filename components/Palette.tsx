'use client';

import { useEffect, useMemo, useState } from 'react';
import yaml from 'js-yaml';

type PaletteItem = { [key: string]: any };

// File mặc định
const DEFAULT_FILES: { name: string; content: string }[] = [
  { name: 'PCs.yaml', content: '- id: PCs\n  label: PCs\n  name: PCs\n  description: "Personal Computers"\n' },
  { name: 'NSP.yaml', content: '- id: NSP\n  label: NSP\n  name: NSP\n  description: "Network Service Platform"\n' },
  { name: 'Syslog.yaml', content: '- id: Syslog\n  label: Syslog\n  name: Syslog\n  description: "Syslog Server"\n' },
];

export function Palette({ onAddZone }: { onAddZone: () => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // 🟢 Chọn folder devices
  const onChooseFolder = async () => {
    try {
      const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
      setDirectoryHandle(handle);

      // Lấy index.json hoặc tạo mới
      let fileNames: string[] = [];
      try {
        const indexFile = await handle.getFileHandle('index.json', { create: true });
        const text = await (await indexFile.getFile()).text();
        fileNames = text ? JSON.parse(text) : [];
      } catch {}

      // Nếu folder trống, thêm file mặc định
      if (fileNames.length === 0) {
        for (const def of DEFAULT_FILES) {
          const fHandle = await handle.getFileHandle(def.name, { create: true });
          const writable = await fHandle.createWritable();
          await writable.write(def.content);
          await writable.close();
          fileNames.push(def.name);
        }

        // Ghi index.json
        const indexHandle = await handle.getFileHandle('index.json', { create: true });
        const writable = await indexHandle.createWritable();
        await writable.write(JSON.stringify(fileNames, null, 2));
        await writable.close();
      }

      // Load tất cả file theo index.json
      const all: PaletteItem[] = [];
      for (const name of fileNames) {
        try {
          const f = await handle.getFileHandle(name);
          const text = await (await f.getFile()).text();
          const data = yaml.load(text);
          if (Array.isArray(data)) all.push(...data);
          else if (data && typeof data === 'object') all.push(data as PaletteItem);
        } catch {}
      }
      setItems(all);
    } catch (err) {
      console.warn('Không chọn folder', err);
    }
  };

  // 🟢 Upload file mới
  const onYamlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!directoryHandle) {
      alert('Hãy chọn folder trước!');
      return;
    }
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // Lấy index.json
    let fileNames: string[] = [];
    try {
      const indexFile = await directoryHandle.getFileHandle('index.json', { create: true });
      const text = await (await indexFile.getFile()).text();
      fileNames = text ? JSON.parse(text) : [];
    } catch {}

    const newItems: PaletteItem[] = [];
    for (const file of files) {
      const text = await file.text();
      const data = yaml.load(text);
      if (Array.isArray(data)) newItems.push(...data);
      else if (data && typeof data === 'object') newItems.push(data as PaletteItem);

      // Lưu file
      const fHandle = await directoryHandle.getFileHandle(file.name, { create: true });
      const writable = await fHandle.createWritable();
      await writable.write(text);
      await writable.close();

      if (!fileNames.includes(file.name)) fileNames.push(file.name);
    }

    // Cập nhật index.json
    const indexHandle = await directoryHandle.getFileHandle('index.json', { create: true });
    const writable = await indexHandle.createWritable();
    await writable.write(JSON.stringify(fileNames, null, 2));
    await writable.close();

    setItems((prev) => [...prev, ...newItems]);
  };

  // 🟢 Search
  const filteredItems = useMemo(
    () =>
      items.filter((i) =>
        Object.values(i)
          .join(' ')
          .toLowerCase()
          .includes(q.toLowerCase())
      ),
    [q, items]
  );

  // 🟢 Drag
  const onDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="sidebar p-4">
      <h3 className="font-bold text-lg mb-2">Components</h3>

      <input
        placeholder="Search..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="border rounded p-1 mb-3 w-full"
      />

      <div className="mb-3 flex flex-col gap-2">
        <button
          className="bg-green-500 text-white px-2 py-1 rounded"
          onClick={onChooseFolder}
        >
          Chọn folder devices cục bộ
        </button>

        <input type="file" multiple accept=".yaml,.yml" onChange={onYamlUpload} />
      </div>

      <div className="palette space-y-2">
        {filteredItems.map((it, idx) => (
          <div
            key={it.id ?? idx}
            className="palette-item border rounded p-2 hover:bg-gray-50 cursor-grab"
            draggable
            onDragStart={(e) => onDragStart(e, it)}
          >
            <div className="font-semibold text-sm">{it.label ?? '[No label]'}</div>
            <div className="text-xs text-gray-500">
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

      <button
        className="zone-button mt-3 bg-blue-500 text-white px-2 py-1 rounded"
        onClick={onAddZone}
      >
        + Add zone
      </button>
    </div>
  );
}
