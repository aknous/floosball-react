import { useState, useCallback, useEffect } from 'react'

export interface TutorialStep {
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  onEnter?: () => void
  onLeave?: () => void
}

interface UseTutorialOptions {
  tourId: string
  steps: TutorialStep[]
}

export function useTutorial({ tourId, steps }: UseTutorialOptions) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [shouldPrompt, setShouldPrompt] = useState(false)

  const promptedKey = `tour_prompted_${tourId}`
  const completedKey = `tour_completed_${tourId}`

  useEffect(() => {
    const prompted = localStorage.getItem(promptedKey)
    if (!prompted) {
      setShouldPrompt(true)
    }
  }, [promptedKey])

  const findNextVisibleStep = useCallback((fromStep: number, direction: 1 | -1): number | null => {
    let idx = fromStep
    while (idx >= 0 && idx < steps.length) {
      const el = document.querySelector(`[data-tour="${steps[idx].target}"]`)
      if (el) return idx
      idx += direction
    }
    return null
  }, [steps])

  const startTour = useCallback(() => {
    localStorage.setItem(promptedKey, '1')
    setShouldPrompt(false)
    const firstVisible = findNextVisibleStep(0, 1)
    if (firstVisible !== null) {
      setCurrentStep(firstVisible)
      setIsActive(true)
    }
  }, [promptedKey, findNextVisibleStep])

  const finish = useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
    localStorage.setItem(completedKey, '1')
  }, [completedKey])

  const next = useCallback(() => {
    const nextVisible = findNextVisibleStep(currentStep + 1, 1)
    if (nextVisible !== null) {
      setCurrentStep(nextVisible)
    } else {
      finish()
    }
  }, [currentStep, findNextVisibleStep, finish])

  const back = useCallback(() => {
    const prevVisible = findNextVisibleStep(currentStep - 1, -1)
    if (prevVisible !== null) {
      setCurrentStep(prevVisible)
    }
  }, [currentStep, findNextVisibleStep])

  const skip = useCallback(() => {
    finish()
  }, [finish])

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(promptedKey, '1')
    setShouldPrompt(false)
  }, [promptedKey])

  const hasCompleted = !!localStorage.getItem(completedKey)

  return {
    isActive,
    currentStep,
    startTour,
    next,
    back,
    skip,
    shouldPrompt,
    dismissPrompt,
    hasCompleted,
  }
}
