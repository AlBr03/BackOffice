type PageLoadingShellProps = {
  title: string
  rows?: number
}

export function PageLoadingShell({ title, rows = 6 }: PageLoadingShellProps) {
  return (
    <div className="ui-stack" aria-busy="true" aria-live="polite">
      <section className="ui-card">
        <div className="ui-card-header">
          <div style={{ display: 'grid', gap: 12, width: 'min(100%, 520px)' }}>
            <div className="ui-skeleton-line" style={{ width: 120, height: 12 }} />
            <div className="ui-skeleton-line" style={{ width: 260, height: 34 }} />
            <div className="ui-skeleton-line" style={{ width: '100%', height: 16 }} />
          </div>
          <div className="ui-skeleton-line" style={{ width: 132, height: 42 }} />
        </div>
      </section>

      <section className="ui-card ui-table-card" style={{ padding: 0 }}>
        <div className="ui-table-header">
          <h2 className="ui-section-title">{title}</h2>
        </div>
        <div className="ui-skeleton-list">
          {Array.from({ length: rows }).map((_, index) => (
            <div className="ui-skeleton-row" key={index}>
              <div className="ui-skeleton-line" style={{ width: '18%' }} />
              <div className="ui-skeleton-line" style={{ width: '26%' }} />
              <div className="ui-skeleton-line" style={{ width: '14%' }} />
              <div className="ui-skeleton-line" style={{ width: '22%' }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
