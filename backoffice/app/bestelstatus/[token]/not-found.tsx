import Link from 'next/link'

export default function TrackingNotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 760,
          padding: 36,
          borderRadius: 30,
          background:
            'radial-gradient(circle at top right, rgba(227,6,19,0.08), transparent 28%), linear-gradient(180deg, #ffffff 0%, #f8faff 100%)',
          border: '1px solid #d9e2f0',
          boxShadow: '0 18px 40px rgba(8,45,120,0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: '#fff1f2',
            color: '#b00012',
            fontSize: 30,
            fontWeight: 800,
            marginBottom: 18,
          }}
        >
          !
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: '#E30613' }}>
          TRACK & TRACE
        </div>
        <h1 style={{ margin: '10px 0 14px 0', color: '#082D78', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
          Deze bestelpagina bestaat niet
        </h1>
        <p style={{ margin: '0 auto 24px auto', maxWidth: 560, color: '#5b6b84', lineHeight: 1.7 }}>
          De link is ongeldig, verlopen of niet volledig gekopieerd. Controleer de link uit de mail
          of neem contact op met uw winkel.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              padding: '0 18px',
              borderRadius: 999,
              background: '#164196',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Naar backoffice
          </Link>
        </div>
      </section>
    </div>
  )
}
