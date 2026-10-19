import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { CheckSquare, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setServerError('')
      await registerUser(data.username, data.email, data.password)
      navigate('/')
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      if (typeof detail === 'string') {
        setServerError(detail)
      } else if (Array.isArray(detail)) {
        setServerError(detail.map((item: any) => item.msg || item.message || JSON.stringify(item)).join(', '))
      } else {
        setServerError(e?.message || 'Registration failed. Please check your details.')
      }
    }
  }

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-4">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Create account</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1 text-sm">Start organizing with TodoFlow</p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Username" placeholder="cool_username" autoFocus error={errors.username?.message} {...register('username')} />
            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-text">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text border-gray-300 dark:border-dark-border placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.password ? 'border-red-400' : ''}`}
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
            </div>
            <Input label="Confirm Password" type={showPw ? 'text' : 'password'} placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

            {serverError && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{serverError}</div>}

            <Button type="submit" className="w-full" loading={isSubmitting} size="lg">Create account</Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-dark-muted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign in</Link>
        </p>
      </div>
    </motion.div>
  )
}
