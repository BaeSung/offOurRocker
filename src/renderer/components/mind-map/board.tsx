import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
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
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { CustomNode, type MindMapNodeData, type MindMapNode } from './custom-node'
import { LabeledEdge, type LabeledEdgeData } from './custom-edge'
import { MindMapToolbar } from './toolbar'
import { ImportNodesDialog, type ImportedNode } from './import-nodes-dialog'
import { useToast } from '@/hooks/use-toast'

interface BoardProps {
  workId: string
}

const nodeTypes = { custom: CustomNode }
const edgeTypes = { labeled: LabeledEdge }

const MAX_HISTORY = 50

interface Snapshot {
  nodes: Node[]
  edges: Edge[]
}

function stripNodeCallbacks(nodes: Node[]): Node[] {
  return nodes.map((n) => ({
    ...n,
    data: { ...n.data, onDelete: undefined, onLabelChange: undefined },
  }))
}

function stripEdgeCallbacks(edges: Edge[]): Edge[] {
  return edges.map((e) => ({
    ...e,
    data: e.data ? { ...e.data, onLabelChange: undefined, onDelete: undefined } : e.data,
  }))
}

function BoardInner({ workId }: BoardProps) {
  const { toast } = useToast()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadedRef = useRef(false)
  const workIdRef = useRef(workId)

  // --- Undo / Redo history ---
  const historyRef = useRef<Snapshot[]>([])
  const redoRef = useRef<Snapshot[]>([])
  const isRestoringRef = useRef(false)

  const pushHistory = useCallback(() => {
    historyRef.current.push({ nodes: stripNodeCallbacks(nodes), edges: stripEdgeCallbacks(edges) })
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift()
    redoRef.current = []
  }, [nodes, edges])

  // Record snapshot on meaningful change (debounced alongside save)
  const lastSnapshotRef = useRef('')
  useEffect(() => {
    if (!isLoadedRef.current || isRestoringRef.current) return
    const key = JSON.stringify({ n: nodes.map((n) => n.id + JSON.stringify(n.position) + JSON.stringify(n.data)), e: edges.map((e) => e.id + (e.data?.label || '')) })
    if (key !== lastSnapshotRef.current) {
      // push previous state
      if (lastSnapshotRef.current !== '') {
        pushHistory()
      }
      lastSnapshotRef.current = key
    }
  }, [nodes, edges, pushHistory])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    const prev = historyRef.current.pop()!
    redoRef.current.push({ nodes: stripNodeCallbacks(nodes), edges: stripEdgeCallbacks(edges) })
    isRestoringRef.current = true
    setNodes(prev.nodes)
    setEdges(prev.edges)
    lastSnapshotRef.current = ''
    requestAnimationFrame(() => { isRestoringRef.current = false })
  }, [nodes, edges, setNodes, setEdges])

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return
    const next = redoRef.current.pop()!
    historyRef.current.push({ nodes: stripNodeCallbacks(nodes), edges: stripEdgeCallbacks(edges) })
    isRestoringRef.current = true
    setNodes(next.nodes)
    setEdges(next.edges)
    lastSnapshotRef.current = ''
    requestAnimationFrame(() => { isRestoringRef.current = false })
  }, [nodes, edges, setNodes, setEdges])

  // --- Copy / Paste ---
  const clipboardRef = useRef<Node[]>([])

  const copySelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected)
    if (selected.length === 0) return
    clipboardRef.current = stripNodeCallbacks(selected)
    toast({ description: `${selected.length}개 노드를 복사했습니다.` })
  }, [nodes, toast])

  const pasteNodes = useCallback(() => {
    if (clipboardRef.current.length === 0) return
    const offset = 40
    const newNodes: Node[] = clipboardRef.current.map((n) => ({
      ...n,
      id: crypto.randomUUID(),
      position: { x: n.position.x + offset, y: n.position.y + offset },
      selected: false,
      data: {
        ...n.data,
        // 복사된 노드는 sourceId 제거 (독립 노드)
        sourceId: undefined,
      },
    }))
    setNodes((nds) => [...nds, ...newNodes])
    toast({ description: `${newNodes.length}개 노드를 붙여넣었습니다.` })
  }, [setNodes, toast])

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 입력 중이면 무시
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        copySelected()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        pasteNodes()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, copySelected, pasteNodes])

  // Track which source IDs already exist on the board
  const existingSourceIds = useMemo(() => {
    const set = new Set<string>()
    for (const node of nodes) {
      const data = node.data as MindMapNodeData
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

  // Edge handlers
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId))
  }, [setEdges])

  const handleEdgeLabelChange = useCallback((edgeId: string, label: string) => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, label } }
          : e
      )
    )
  }, [setEdges])

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

  // Inject callbacks into edge data
  const edgesWithCallbacks = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onLabelChange: handleEdgeLabelChange,
        onDelete: handleDeleteEdge,
      },
    }))
  }, [edges, handleEdgeLabelChange, handleDeleteEdge])

  // Clean up connected edges when nodes deleted via keyboard
  const onNodesDelete = useCallback((deleted: Node[]) => {
    const deletedIds = new Set(deleted.map((n) => n.id))
    setEdges((eds) => eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)))
  }, [setEdges])

  // Load board data
  useEffect(() => {
    workIdRef.current = workId
    isLoadedRef.current = false
    historyRef.current = []
    redoRef.current = []
    lastSnapshotRef.current = ''

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
      toast({ description: '마인드맵 데이터를 불러오지 못했습니다.', variant: 'destructive' })
    })
  }, [workId, rfInstance, setNodes, setEdges, toast])

  // Auto-save with debounce
  const saveBoard = useCallback(() => {
    if (!isLoadedRef.current || !rfInstance) return

    const flow = rfInstance.toObject()
    const cleanNodes = stripNodeCallbacks(flow.nodes)
    const cleanEdges = stripEdgeCallbacks(flow.edges)

    const payload = JSON.stringify({
      nodes: cleanNodes,
      edges: cleanEdges,
      viewport: flow.viewport,
    })

    window.api.mindMap.save(workIdRef.current, payload).catch(() => {
      toast({ description: '마인드맵 저장에 실패했습니다.', variant: 'destructive' })
    })
  }, [rfInstance, toast])

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
            type: 'labeled',
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(30 40% 64%)' },
            style: { stroke: 'hsl(30 8% 50%)', strokeWidth: 1.5 },
            data: { label: '' },
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
      const result = await window.api.mindMap.exportPng(dataUrl)
      if (result.success) {
        toast({ description: 'PNG 이미지로 내보냈습니다.' })
      }
    } catch {
      toast({ description: 'PNG 내보내기에 실패했습니다.', variant: 'destructive' })
    }
  }, [rfInstance, toast])

  const handleExportJson = useCallback(async () => {
    if (!rfInstance) return
    const flow = rfInstance.toObject()
    const cleanNodes = stripNodeCallbacks(flow.nodes)
    const cleanEdges = stripEdgeCallbacks(flow.edges)
    const json = JSON.stringify({ nodes: cleanNodes, edges: cleanEdges, viewport: flow.viewport }, null, 2)
    try {
      const result = await window.api.mindMap.exportJson(json)
      if (result.success) {
        toast({ description: 'JSON 파일로 내보냈습니다.' })
      }
    } catch {
      toast({ description: 'JSON 내보내기에 실패했습니다.', variant: 'destructive' })
    }
  }, [rfInstance, toast])

  const handleImportJson = useCallback(async () => {
    try {
      const result = await window.api.mindMap.importJson()
      if (result.success && result.data) {
        setNodes(result.data.nodes as Node[])
        setEdges(result.data.edges as Edge[])
        toast({ description: 'JSON 파일을 불러왔습니다.' })
      } else if (result.error && result.error !== 'Cancelled') {
        toast({ description: '올바른 마인드맵 JSON 형식이 아닙니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: 'JSON 불러오기에 실패했습니다.', variant: 'destructive' })
    }
  }, [setNodes, setEdges, toast])

  const handleZoomIn = useCallback(() => rfInstance?.zoomIn(), [rfInstance])
  const handleZoomOut = useCallback(() => rfInstance?.zoomOut(), [rfInstance])
  const handleFitView = useCallback(() => rfInstance?.fitView({ padding: 0.2 }), [rfInstance])

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edgesWithCallbacks}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onConnect={onConnect}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'labeled',
          markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(30 40% 64%)' },
          style: { stroke: 'hsl(30 8% 50%)', strokeWidth: 1.5 },
        }}
        deleteKeyCode={['Backspace', 'Delete']}
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

export function Board({ workId }: BoardProps) {
  return (
    <ReactFlowProvider>
      <BoardInner workId={workId} />
    </ReactFlowProvider>
  )
}
