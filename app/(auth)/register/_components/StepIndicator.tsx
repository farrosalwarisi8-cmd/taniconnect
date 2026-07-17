import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
  totalSteps:  number
}

const STEP_LABELS = ['Data Diri', 'Lokasi', 'Verifikasi KTP']

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, idx) => {
          const isCompleted = step < currentStep
          const isActive    = step === currentStep

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Bulatan step */}
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold shrink-0 transition-all',
                  isCompleted && 'bg-primary text-white',
                  isActive    && 'bg-primary-dark text-white ring-4 ring-primary/20',
                  !isCompleted && !isActive && 'bg-surface-light border border-border text-fg/40',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? '✓' : step}
              </div>

              {/* Garis penghubung */}
              {idx < totalSteps - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-all',
                    isCompleted ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      <p className="text-caption text-fg/60 text-center">
        Langkah {currentStep} dari {totalSteps} — <span className="font-semibold text-fg">{STEP_LABELS[currentStep - 1]}</span>
      </p>
    </div>
  )
}