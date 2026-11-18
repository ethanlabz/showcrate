import { useEffect } from 'react'
import Lenis from 'lenis'

export default function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let cleanup = () => {}

    function setup() {
      cleanup()
      if (reducedMotion.matches) return

      const lenis = new Lenis()
      let frame: number

      function raf(time: number) {
        lenis.raf(time)
        frame = requestAnimationFrame(raf)
      }

      frame = requestAnimationFrame(raf)
      cleanup = () => {
        cancelAnimationFrame(frame)
        lenis.destroy()
      }
    }

    setup()
    reducedMotion.addEventListener('change', setup)
    return () => {
      reducedMotion.removeEventListener('change', setup)
      cleanup()
    }
  }, [])

  return null
}