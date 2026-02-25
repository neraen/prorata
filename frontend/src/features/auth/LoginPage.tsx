import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../lib/stores'
import { Button, Input, Card } from '../../components/ui'
import { AuthLayout } from '../../components/AuthLayout'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-2">Bienvenue</h1>
          <p className="text-text-muted">Connectez-vous pour continuer</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-[12px] bg-danger/10 text-danger text-sm text-center">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="votre@email.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Mot de passe"
            type="password"
            placeholder="Votre mot de passe"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Se connecter
          </Button>
        </form>

        <p className="text-center text-text-muted text-sm mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-accent font-medium hover:underline">
            Créer un compte
          </Link>
        </p>
      </Card>
    </AuthLayout>
  )
}