import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../lib/stores'
import { Button, Input, Card } from '../../components/ui'
import { AuthLayout } from '../../components/AuthLayout'

const schema = z.object({
  name: z.string().min(2, 'Le nom doit faire au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const registerUser = useAuthStore((s) => s.register)
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
      await registerUser(data.email, data.password, data.name)
      navigate('/setup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription')
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-2">Créer un compte</h1>
          <p className="text-text-muted">Rejoignez Prorata</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-[12px] bg-danger/10 text-danger text-sm text-center">
              {error}
            </div>
          )}

          <Input
            label="Prénom"
            type="text"
            placeholder="Votre prénom"
            error={errors.name?.message}
            {...register('name')}
          />

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
            placeholder="8 caractères minimum"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            S'inscrire
          </Button>
        </form>

        <p className="text-center text-text-muted text-sm mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </Card>
    </AuthLayout>
  )
}