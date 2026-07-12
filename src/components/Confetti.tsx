import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  color: string
  delay: number
  duration: number
  size: number
}

const COLORS = ['#9ed072', '#f38c71', '#e7c664', '#fc5d7c', '#ecac6a']

interface ConfettiProps {
  active: boolean
}

export default function Confetti({ active }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }

    const items: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.2,
      duration: 0.6 + Math.random() * 0.6,
      size: 6 + Math.random() * 6,
    }))

    setParticles(items)

    const maxTime = 1.4
    const timer = setTimeout(() => {
      setParticles([])
    }, maxTime * 1000 + 100)

    return () => clearTimeout(timer)
  }, [active])

  if (particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-1/2 left-0 animate-confetti rounded-sm"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            '--delay': `${p.delay}s`,
            '--duration': `${p.duration}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
