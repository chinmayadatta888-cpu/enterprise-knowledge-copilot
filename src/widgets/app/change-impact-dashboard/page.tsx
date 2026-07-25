'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ChangeImpactData {
  olderFilename: string;
  newerFilename: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  affectedTeams: string[];
  recommendedActions: string[];
  changeHighlights: string[];
  removedHighlights: string[];
}

export default function ChangeImpactDashboard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ChangeImpactData>();
  const isDark = theme === 'dark';
  const foreground = isDark ? '#f8fafc' : '#172033';
  const muted = isDark ? '#cbd5e1' : '#526075';
  const surface = isDark ? '#172033' : '#f8fafc';
  const panel = isDark ? '#222f45' : '#ffffff';
  const border = isDark ? '#3a4a63' : '#d8e0eb';
  const priorityColor = data?.priority === 'critical' ? '#dc2626'
    : data?.priority === 'high' ? '#ea580c'
    : data?.priority === 'medium' ? '#ca8a04' : '#16a34a';

  if (!data) {
    return <div style={{ padding: 24, color: foreground }}>Loading change impact analysis...</div>;
  }

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, color: muted }}>{title}</h3>
      {children}
    </section>
  );

  return (
    <main style={{ background: surface, color: foreground, padding: 20, borderRadius: 16, maxWidth: 760, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <p style={{ margin: 0, color: muted, fontSize: 13 }}>Enterprise Knowledge Copilot</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 22 }}>Change Impact Dashboard</h1>
          <p style={{ margin: '6px 0 0', color: muted, fontSize: 14 }}>{data.olderFilename} to {data.newerFilename}</p>
        </div>
        <div style={{ background: priorityColor, color: '#fff', borderRadius: 999, padding: '7px 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
          {data.priority} priority
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Card title="Affected teams">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.affectedTeams.map(team => <span key={team} style={{ background: isDark ? '#324766' : '#e7eef8', borderRadius: 999, padding: '6px 9px', fontSize: 13 }}>{team}</span>)}
          </div>
        </Card>
        <Card title="Recommended actions">
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 7, fontSize: 14 }}>
            {data.recommendedActions.map(action => <li key={action}>{action}</li>)}
          </ol>
        </Card>
        <Card title="What changed">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 7, fontSize: 14 }}>
            {data.changeHighlights.slice(0, 4).map(change => <li key={change}>{change}</li>)}
          </ul>
        </Card>
        <Card title="Removed or retired">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 7, fontSize: 14 }}>
            {data.removedHighlights.length ? data.removedHighlights.slice(0, 4).map(change => <li key={change}>{change}</li>) : <li>No retired items detected.</li>}
          </ul>
        </Card>
      </div>
    </main>
  );
}
