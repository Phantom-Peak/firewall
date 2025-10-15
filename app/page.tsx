'use client';

import { ReactFlowProvider } from 'reactflow';
import FlowCanvas from '@/components/FlowCanvas';

export default function Page() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
