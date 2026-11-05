import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Workbench — The RPG Operating System for Makers, Engineers & Creators';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          backgroundColor: '#0b0f17',
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(37, 99, 235, 0.22) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.18) 0%, transparent 50%)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                fontSize: '26px',
                fontWeight: 'bold',
                color: '#ffffff',
              }}
            >
              W
            </div>
            <span style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Workbench
            </span>
          </div>

          <div
            style={{
              padding: '8px 20px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            v2.1 Production Launch
          </div>
        </div>

        {/* Center Main Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '960px' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: 0,
              color: '#ffffff',
            }}
          >
            The RPG Operating System for Makers, Engineers &amp; Creators
          </h1>
          <p
            style={{
              fontSize: '22px',
              lineHeight: 1.4,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            Gamify your workshop. Track builds with task dependencies, level up craft skills with deterministic XP, manage materials with 1-click restock links, and calculate lab formulas.
          </p>
        </div>

        {/* Bottom Feature Badges & URL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '32px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['RPG Skill Progression', 'Maker Inventory & BOM', 'Lab Calculators', 'Community Showcase'].map((pill) => (
              <div
                key={pill}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {pill}
              </div>
            ))}
          </div>

          <span style={{ fontSize: '18px', fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.01em' }}>
            workbenchsoc.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
