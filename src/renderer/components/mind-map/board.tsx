import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  BackgroundVariant,
  ConnectionLineType,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { CustomNode, type MindMapNodeData } from './custom-node'
import { MindMapToolbar } from './toolbar'
import { ImportNodesDialog, type ImportedNode } from './import-nodes-dialog'

interface BoardProps {
  workId: string
}

const nodeTypes = { custom: CustomNode }

export function Board({ workId }: BoardProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadedRef = useRef(false)
  const workIdRef = useRef(workId)

  // Track which source IDs already exist on the board
  const existingSourceIds = useMemo(() => {
    const set = new Set<string>()
    for (const node of nodes) {
      const data = node.data as unknown as MindMapNodeData
      if (data.sourceId) set.add(data.sourceId)
    }
    return set
  }, [nodes])

  // Attach callbacks to node data
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, label } }
          : n
      )
    )
  }, [setNodes])

  // Inject callbacks into node data
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDelete: handleDeleteNode,
        onLabelChange: handleLabelChange,
      },
    }))
  }, [nodes, handleDeleteNode, handleLabelChange])

  // Load board data
  useEffect(() => {
    workIdRef.current = workId
    isLoadedRef.current = false

    window.api.mindMap.get(workId).then((data) => {
      if (workIdRef.current !== workId) return
      const loadedNodes = (data.nodes || []) as Node[]
      const loadedEdges = (data.edges || []) as Edge[]

      setNodes(loadedNodes)
      setEdges(loadedEdges)

      // Restore viewport if available
      if (data.viewport && rfInstance) {
        rfInstance.setViewport(data.viewport)
      }

      isLoadedRef.current = true
    }).catch(() => {
      isLoadedRef.current = true
    })
  }, [workId, rfInstance, setNodes, setEdges])

  // Auto-save with debounce
  const saveBoard = useCallback(() => {
    if (!isLoadedRef.current || !rfInstance) return

    const flow = rfInstance.toObject()
    // Strip callbacks from node data before saving
    const cleanNodes = flow.nodes.map((n) => ({
      ...n,
      data: { ...n.data, onDelete: undefined, onLabelChange: undefined },
    }))

    const payload = JSON.stringify({
      nodes: cleanNodes,
      edges: flow.edges,
      viewport: flow.viewport,
    })

    window.api.mindMap.save(workIdRef.current, payload).catch(() => {})
  }, [rfInstance])

  // Trigger save whenever nodes or edges change
  useEffect(() => {
    if (!isLoadedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(saveBoard, 1000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [nodes, edges, saveBoard])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'default',
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(30 40% 64%)' },
            style: { stroke: 'hsl(30 8% 50%)', strokeWidth: 1.5 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  // Add a free node at the center of the viewport
  const handleAddFreeNode = useCallback(() => {
    if (!rfInstance) return
    const center = rfInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })

    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'custom',
      position: { x: center.x - 80, y: center.y - 30 },
      data: {
        label: '새 노드',
        nodeType: 'free',
      } satisfies Omit<MindMapNodeData, 'onDelete' | 'onLabelChange'>,
    }

    setNodes((nds) => [...nds, newNode])
  }, [rfInstance, setNodes])

  // Import existing data as nodes
  const handleImportNodes = useCallback(
    (imported: ImportedNode[]) => {
      if (!rfInstance) return

      const center = rfInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })

      const newNodes: Node[] = imported.map((item, i) => {
        const cols = Math.ceil(Math.sqrt(imported.length))
        const col = i % cols
        const row = Math.floor(i / cols)

        return {
          id: crypto.randomUUID(),
          type: 'custom',
          position: {
            x: center.x + col * 200 - (cols * 200) / 2,
            y: center.y + row * 120 - 60,
          },
          data: {
            label: item.label,
            description: item.description,
            color: item.color,
            nodeType: item.type,
            sourceId: item.sourceId,
            role: item.role,
            category: item.category,
          } satisfies Omit<MindMapNodeData, 'onDelete' | 'onLabelChange'>,
        }
      })

      setNodes((nds) => [...nds, ...newNodes])
    },
    [rfInstance, setNodes]
  )

  // Export handlers
  const handleExportPng = useCallback(async () => {
    if (!rfInstance) return
    const { toPng } = await import('html-to-image')
    const flowEl = document.querySelector('.react-flow') as HTMLElement
    if (!flowEl) return

    try {
      const dataUrl = await toPng(flowEl, {
        backgroundColor: 'hsl(240, 20%, 6%)',
        quality: 1,
      })
      await window.api.mindMap.exportPng(dataUrl)
    } catch {
      // export failed
    }
  }, [rfInstance])

  const handleExportJson = useCallback(() => {
    if (!rfInstance) return
    const flow = rfInstance.toObject()
    const cleanNodes = flow.nodes.map((n) => ({
      ...n,
      data: { ...n.data, onDelete: undefined, onLabelChange: undefined },
    }))
    const json = JSON.stringify({ nodes: cleanNodes, edges: flow.edges, viewport: flow.viewport }, null, 2)
    window.api.mindMap.exportJson(json).catch(() => {})
  }, [rfInstance])

  const handleImportJson = useCallback(async () => {
    const result = await window.api.mindMap.importJson()
    if (result.success && result.data) {
      setNodes(result.data.nodes as Node[])
      setEdges(result.data.edges as Edge[])
    }
  }, [setNodes, setEdges])

  const handleZoomIn = useCallback(() => rfInstance?.zoomIn(), [rfInstance])
  const handleZoomOut = useCallback(() => rfInstance?.zoomOut(), [rfInstance])
  const handleFitView = useCallback(() => rfInstance?.fitView({ padding: 0.2 }), [rfInstance])

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'default',
          markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(30 40% 64%)' },
          style: { stroke: 'hsl(30 8% 50%)', strokeWidth: 1.5 },
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="mind-map-flow"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(240 10% 16%)"
        />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!rounded-lg !border !border-border !bg-card"
        />
      </ReactFlow>

      {/* Floating toolbar */}
      <div className="absolute left-4 top-4 z-10">
        <MindMapToolbar
          onAddFreeNode={handleAddFreeNode}
          onImportData={() => setImportDialogOpen(true)}
          onExportPng={handleExportPng}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
        />
      </div>

      <ImportNodesDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        workId={workId}
        existingSourceIds={existingSourceIds}
        onImport={handleImportNodes}
      />
    </div>
  )
}
