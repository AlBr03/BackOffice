import type { ReactNode } from 'react'

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return <div style={{ minHeight: 'calc(100vh - 140px)', display: 'grid', placeItems: 'center' }}>
    <section className="ui-card" style={{ width: '100%', maxWidth: 430, padding: 28 }}>
      <h1 style={{ color: 'var(--heading-color)', marginTop: 0 }}>{title}</h1>{children}
    </section>
  </div>
}
