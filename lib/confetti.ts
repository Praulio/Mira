"use client"

import confetti from "canvas-confetti"

/**
 * Fires celebratory confetti from both sides of the screen.
 * Respects user's prefers-reduced-motion preference.
 */
export function fireConfetti() {
  if (typeof window === "undefined") return

  // Respect user preference for reduced motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches

  if (prefersReducedMotion) return

  const duration = 2500
  const end = Date.now() + duration

  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]

  const frame = () => {
    if (Date.now() > end) return

    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors,
    })

    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors,
    })

    requestAnimationFrame(frame)
  }

  frame()
}

/**
 * Plays a short celebration sound.
 * Respects user's prefers-reduced-motion preference as a proxy for reduced audio.
 */
export function playCelebrationSound() {
  if (typeof window === "undefined") return

  // Respect user preference for reduced motion (also implies reduced audio)
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches

  if (prefersReducedMotion) return

  // Use Web Audio API for a simple success tone
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    )

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch {
    // Silently fail if audio is not supported
  }
}
