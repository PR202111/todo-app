import { useCallback, useEffect, useState } from 'react'
import { categoriesApi } from '../api/client'

export interface Category {
  id: number
  name: string
  color: string
  icon?: string
  order: number
  user_id: number
  created_at: string
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoriesApi.getAll()
      setCategories(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const addCategory = useCallback(async (data: { name: string; color: string }) => {
    const res = await categoriesApi.create(data)
    setCategories(prev => [...prev, res.data])
    return res.data as Category
  }, [])

  const updateCategory = useCallback(async (id: number, data: Partial<Category>) => {
    const res = await categoriesApi.update(id, data)
    setCategories(prev => prev.map(c => c.id === id ? res.data : c))
  }, [])

  const deleteCategory = useCallback(async (id: number) => {
    await categoriesApi.delete(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }, [])

  return { categories, loading, addCategory, updateCategory, deleteCategory, refetch: fetchCategories }
}
