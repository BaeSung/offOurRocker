import { useState, useEffect, useRef } from 'react'
import { Target, CalendarDays, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import type { Goal } from '../../../shared/types'
import { toast } from '@/hooks/use-toast'

interface GoalFormData {
  title: string
  description: string
  targetType: 'daily' | 'total' | 'deadline'
  targetValue: number
  deadline: string
}

const EMPTY_FORM: GoalFormData = {
  title: '',
  description: '',
  targetType: 'total',
  targetValue: 10000,
  deadline: '',
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  daily: '일일 목표',
  total: '총 목표',
  deadline: '마감 기한',
}

/* ── GoalForm (inline create / edit) ── */

function GoalForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: GoalFormData
  onSubmit: (data: GoalFormData) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<GoalFormData>(initial || EMPTY_FORM)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit({ ...form, title: form.title.trim(), description: form.description.trim() })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-card p-5"
    >
      <input
        ref={titleRef}
        placeholder="목표 제목"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
      />
      <input
        placeholder="설명 (선택)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
      />
      <div className="flex items-center gap-3">
        <select
          value={form.targetType}
          onChange={(e) =>
            setForm({ ...form, targetType: e.target.value as GoalFormData['targetType'] })
          }
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
        >
          <option value="total">총 목표 (자)</option>
          <option value="daily">일일 목표 (자)</option>
          <option value="deadline">마감 기한</option>
        </select>
        <input
          type="number"
          min={1}
          value={form.targetValue}
          onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })}
          className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground">마감일</label>
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
        >
          <X className="h-3 w-3" />
          취소
        </button>
        <button
          type="submit"
          disabled={!form.title.trim()}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Check className="h-3 w-3" />
          {initial ? '수정' : '추가'}
        </button>
      </div>
    </form>
  )
}

/* ── GoalCard ── */

interface GoalCardProps {
  goal: Goal
  delay: number
  onEdit: () => void
  onDelete: () => void
}

function GoalCard({ goal, delay, onEdit, onDelete }: GoalCardProps) {
  const pct =
    goal.targetValue > 0
      ? Math.min((goal.currentValue / goal.targetValue) * 100, 100)
      : 0

  const unit = goal.targetType === 'total' ? '자' : goal.targetType === 'daily' ? '자' : '편'

  let dDay = ''
  let dailyNeeded = ''
  if (goal.deadline) {
    const deadlineDate = new Date(goal.deadline)
    const today = new Date()
    const diffMs = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffMs / 86400000)
    dDay = diffDays >= 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`

    if (diffDays > 0 && goal.targetValue > goal.currentValue) {
      const remaining = goal.targetValue - goal.currentValue
      const perDay = Math.ceil(remaining / diffDays)
      dailyNeeded = `하루 약 ${perDay.toLocaleString()}${unit}`
    }
  }

  return (
    <div
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
      style={{
        opacity: 0,
        animation: `fadeSlideUp 400ms ${delay}ms ease-out forwards`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">{goal.title}</h3>
          {goal.description && (
            <p className="text-xs text-muted-foreground">{goal.description}</p>
          )}
          <span className="text-[10px] text-muted-foreground/60">
            {TARGET_TYPE_LABELS[goal.targetType] || goal.targetType}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {dDay && (
            <span className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold tabular-nums text-primary">
              {dDay}
            </span>
          )}
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="수정"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
              title="삭제"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${pct}%`,
              animation: `progressGrow 600ms ${delay + 200}ms ease-out forwards`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
            {unit}
          </span>
          <span className="tabular-nums font-medium text-foreground/80">{pct.toFixed(1)}%</span>
        </div>
      </div>

      {dailyNeeded && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          <span>{dailyNeeded}</span>
        </div>
      )}
    </div>
  )
}

/* ── GoalTracker ── */

export function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const reload = () => {
    window.api.goals.getAll().then(setGoals).catch(() => {})
  }

  useEffect(() => {
    reload()
  }, [])

  const handleCreate = async (data: GoalFormData) => {
    try {
      await window.api.goals.create({
        title: data.title,
        description: data.description || undefined,
        targetType: data.targetType,
        targetValue: data.targetValue,
        deadline: data.deadline || undefined,
      })
      setShowForm(false)
      reload()
      toast({ description: '목표가 추가되었습니다.' })
    } catch {
      toast({ description: '목표 추가에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleEdit = async (data: GoalFormData) => {
    if (!editingGoal) return
    await window.api.goals.update(editingGoal.id, {
      title: data.title,
      targetValue: data.targetValue,
    })
    setEditingGoal(null)
    reload()
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.goals.delete(id)
      reload()
      toast({ description: '목표가 삭제되었습니다.' })
    } catch {
      toast({ description: '목표 삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  return (
    <section
      style={{
        opacity: 0,
        animation: 'fadeSlideUp 400ms 1100ms ease-out forwards',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="font-sans text-lg font-semibold text-foreground">목표</h2>
        </div>
        {!showForm && !editingGoal && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            새 목표
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <GoalForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {goals.length === 0 && !showForm ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">설정된 목표가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal, i) =>
            editingGoal?.id === goal.id ? (
              <GoalForm
                key={goal.id}
                initial={{
                  title: goal.title,
                  description: goal.description || '',
                  targetType: goal.targetType,
                  targetValue: goal.targetValue,
                  deadline: goal.deadline || '',
                }}
                onSubmit={handleEdit}
                onCancel={() => setEditingGoal(null)}
              />
            ) : (
              <GoalCard
                key={goal.id}
                goal={goal}
                delay={1150 + i * 100}
                onEdit={() => setEditingGoal(goal)}
                onDelete={() => handleDelete(goal.id)}
              />
            )
          )}
        </div>
      )}
    </section>
  )
}
