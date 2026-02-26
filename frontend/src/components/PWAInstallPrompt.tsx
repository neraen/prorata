import { useState } from 'react'
import { usePWA } from '../hooks/usePWA'

export function PWAInstallPrompt() {
  const { canInstall, promptInstall } = usePWA()
  const [dismissed, setDismissed] = useState(false)

  if (!canInstall || dismissed) return null

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (!accepted) {
      setDismissed(true)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">Installer Prorata</p>
            <p className="text-sm text-gray-500 mt-1">
              Ajoutez l'application à votre écran d'accueil pour un accès rapide.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Installer
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Non merci
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}