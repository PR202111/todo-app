import { useCallback, useEffect, useState } from 'react'
import { tasksApi } from '../api/client'

export interface Task {
  id: number
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  order: number
  user_id: number
  category_id?: number
  created_at: string
  updated_at: string
  category?: { id: number; name: string; color: string }
}

export function useTasks(filters?: { category_id?: number; completed?: boolean; priority?: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await tasksApi.getAll(filters)
      setTasks(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const addTask = useCallback(async (data: Partial<Task>) => {
    const res = await tasksApi.create({ ...data, order: tasks.length })
    setTasks(prev => [...prev, res.data])
    return res.data as Task
  }, [tasks.length])

  const updateTask = useCallback(async (id: number, data: Partial<Task>) => {
    const res = await tasksApi.update(id, data)
    setTasks(prev => prev.map(t => t.id === id ? res.data : t))
    return res.data as Task
  }, [])

  const deleteTask = useCallback(async (id: number) => {
    await tasksApi.delete(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  const reorderTasks = useCallback(async (newTasks: Task[]) => {
    setTasks(newTasks)
    await tasksApi.reorder(newTasks.map((t, i) => ({ id: t.id, order: i })))
  }, [])

  return { tasks, loading, addTask, updateTask, deleteTask, reorderTasks, refetch: fetchTasks }
}
