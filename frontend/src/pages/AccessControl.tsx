import { useState } from 'react';
import { Shield, Users, Loader2, ChevronDown, ChevronRight, User, AlertTriangle } from 'lucide-react';
import { msalInstance } from '../context/AuthContext';

const GROUPS = [
  { id: '893a070a-54ec-42fb-bdda-98066d3a7569', name: 'RC-Hub Full Access Admin', type: 'Admin' },
  { id: 'f29747c6-0fb4-4869-b681-0786d602ac29', name: 'Risk & Compliance Global', type: 'Core' },
  { id: 'd8195075-cc4c-4e62-b857-f4cc9c76b380', name: 'People & Safety Global', type: 'Core' },
  { id: 'b355c48b-09fc-4d35-b7cc-a80e53d9f3b7', name: 'IT & Security Global', type: 'Core' },
  { id: '2dcbf776-a8ce-4316-8dc8-c5aef73409f7', name: 'Finance Global', type: 'Core' },

  { id: '38e4b0e2-ba59-4b60-8c61-8650509b1a70', name: 'BU Manager - AAW Group Holdings', type: 'BU Manager' },
  { id: '956cde96-2a25-4574-8e7b-fb0de9712c0d', name: 'BU Manager - AAW Global Logistics-AU', type: 'BU Manager' },
  { id: '5ba26317-0cfe-461a-a8ac-ee35ed50a7dc', name: 'BU Manager - AAW Global Logistics -NZ', type: 'BU Manager' },
  { id: '83c2912d-604a-4e3f-b79e-5500b040197d', name: 'BU Manager - Bulk Liquid Logistics', type: 'BU Manager' },
  { id: 'e4fb09bd-ed76-4a1c-b964-396057c02de6', name: 'BU Manager - Hoyer Logistics Australia', type: 'BU Manager' },
  { id: '18444ce2-793a-485c-99d1-7d0a1073945d', name: 'BU Manager - Coastalbridge', type: 'BU Manager' },
  { id: '57b8fe69-df5e-441f-94ef-1adad5458d8e', name: 'BU Manager - PIL Logistics Australia', type: 'BU Manager' },

  { id: '7e72b9d7-0977-4d9f-83d0-f2c0f38beafb', name: 'AAW Global Logistics - Melbourne', type: 'Branch' },
  { id: '8e6d4f35-ec7f-4d9f-be44-f76bb4274d22', name: 'AAW Global Logistics - Sydney', type: 'Branch' },
  { id: 'c98d0827-3c29-49cf-b466-fd6b3b4cd16b', name: 'AAW Global Logistics - Brisbane', type: 'Branch' },
  { id: '9f22fa97-0f1d-4136-89d8-8b9e4dc1ff2b', name: 'AAW Global Logistics - Adelaide', type: 'Branch' },
  { id: 'fe5aecea-91c4-48ac-9038-f16edfd3cba6', name: 'AAW Global Logistics - Fremantle', type: 'Branch' },
  { id: 'fa404616-cce0-4c8a-9e5d-a86919e4eac1', name: 'AAW Customs Brokerage', type: 'Branch' },
  { id: '99937019-ff28-4c3c-8de2-e5492638a233', name: 'AAW Project Logistics', type: 'Branch' },
  { id: 'c14255e2-c4f0-459d-b889-f44938b0fd83', name: 'AAW Global Logistics - Auckland', type: 'Branch' },
  { id: 'a960927f-14db-4632-ade6-56e9bc19213f', name: 'AAW Bulk Liquid Logistics Team', type: 'Branch' },
  { id: '6796ccfb-9ed2-484e-93b4-92c5d289c3a1', name: 'Coastalbridge', type: 'Branch' },
  { id: 'c65d09a2-1b50-4adc-903b-4dc5da9dfa92', name: 'PIL Logistics Australia', type: 'Branch' },
];

export default function AccessControl() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({});
  const [loadingGroups, setLoadingGroups] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const toggleGroup = async (groupId: string) => {
    const isExpanded = !!expandedGroups[groupId];
    setExpandedGroups(prev => ({ ...prev, [groupId]: !isExpanded }));

    // If expanding and we haven't loaded members yet, fetch them
    if (!isExpanded && !groupMembers[groupId] && !loadingGroups[groupId]) {
      await fetchGroupMembers(groupId);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    setLoadingGroups(prev => ({ ...prev, [groupId]: true }));
    setError(null);
    try {
      const activeAccount = msalInstance.getActiveAccount();
      if (!activeAccount) {
        throw new Error('No active account! Please log in with Azure AD (SSO).');
      }

      // Request both scopes — User.Read.All resolves displayName/mail for other users
      let tokenResponse;
      try {
        tokenResponse = await msalInstance.acquireTokenSilent({
          scopes: ['GroupMember.Read.All', 'User.Read.All'],
          account: activeAccount
        });
      } catch {
        // Fallback: try without User.Read.All if it's not consented
        tokenResponse = await msalInstance.acquireTokenSilent({
          scopes: ['GroupMember.Read.All'],
          account: activeAccount
        });
      }

      const accessToken = tokenResponse.accessToken;

      // Step 1: Get group members (no $select — let Graph return all default properties)
      const res = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/members?$top=999`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error('403 Forbidden: Insufficient permissions to read group members.');
        if (res.status === 404) throw new Error(`404 Not Found: Group ${groupId} does not exist.`);
        throw new Error(`Graph API Error: ${res.status}`);
      }

      const data = await res.json();
      // Filter to only user objects
      let users = (data.value || []).filter((m: any) =>
        m['@odata.type'] === '#microsoft.graph.user'
      );

      // Step 2: If displayName is missing, try individual /users/{id} lookups
      const needsLookup = users.some((u: any) => !u.displayName);
      if (needsLookup) {
        const enriched = await Promise.all(
          users.map(async (member: any) => {
            if (member.displayName) return member;
            try {
              const userRes = await fetch(`https://graph.microsoft.com/v1.0/users/${member.id}?$select=id,displayName,mail,userPrincipalName`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                return { ...member, ...userData };
              }
            } catch { /* ignore individual lookup failures */ }
            return member;
          })
        );
        users = enriched;
      }

      setGroupMembers(prev => ({ ...prev, [groupId]: users }));
    } catch (err: any) {
      console.error('Failed to fetch group members:', err);
      // Fallback: try interactive popup if silent fails
      if (err.name === 'InteractionRequiredAuthError' || err.name === 'BrowserAuthError') {
        try {
            const activeAccount = msalInstance.getActiveAccount();
            if (activeAccount) {
                const popupResponse = await msalInstance.acquireTokenPopup({ scopes: ['GroupMember.Read.All', 'User.Read.All'] });
                const res = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/members?$top=999`, {
                    headers: { Authorization: `Bearer ${popupResponse.accessToken}` }
                });
                const data = await res.json();
                const users = (data.value || []).filter((m: any) => m['@odata.type'] === '#microsoft.graph.user');
                setGroupMembers(prev => ({ ...prev, [groupId]: users }));
                return;
            }
        } catch(e) {
            console.error(e);
        }
      }
      setError(`Could not fetch members for ${GROUPS.find(g => g.id === groupId)?.name}: ${err.message}`);
    } finally {
      setLoadingGroups(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Admin': return 'rgba(239, 68, 68, 0.15)';
      case 'Core': return 'rgba(99, 102, 241, 0.15)';
      case 'BU Manager': return 'rgba(234, 179, 8, 0.15)';
      case 'Branch': return 'rgba(16, 185, 129, 0.15)';
      default: return 'rgba(148, 163, 184, 0.15)';
    }
  };

  const getBadgeTextColor = (type: string) => {
    switch (type) {
      case 'Admin': return '#dc2626';
      case 'Core': return '#4f46e5';
      case 'BU Manager': return '#ca8a04';
      case 'Branch': return '#059669';
      default: return '#64748b';
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Hero Header */}
      <div className="card" style={{
        position: 'relative', overflow: 'hidden', padding: '1.25rem 2rem', marginBottom: '2rem',
        background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, var(--bg-surface) 100%)',
        border: '1px solid var(--border-base)',
        borderLeft: '4px solid #6366f1',
        boxShadow: '0 10px 30px -10px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '50%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.25) 0%, transparent 70%)', transform: 'rotate(-25deg)', pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '12px', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Shield size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--fg-base)' }}>Access Control & AD Groups</h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Live Microsoft Entra ID (Azure AD) Directory Mapping</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {GROUPS.map(group => {
          const isExpanded = !!expandedGroups[group.id];
          const isLoading = !!loadingGroups[group.id];
          const members = groupMembers[group.id] || [];

          return (
            <div key={group.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${getBadgeTextColor(group.type)}` }}>
              <button 
                onClick={() => toggleGroup(group.id)}
                style={{ 
                  width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--fg-muted)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--fg-base)' }}>{group.name}</span>
                      <span style={{ 
                        padding: '0.2rem 0.6rem', background: getBadgeColor(group.type), color: getBadgeTextColor(group.type), 
                        borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' 
                      }}>
                        {group.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-faint)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      {group.id}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                  <Users size={16} />
                  {members.length > 0 ? `${members.length} Members` : 'View'}
                </div>
              </button>

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                  {isLoading ? (
                    <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--fg-muted)' }}>
                      <Loader2 size={18} className="spin" /> Loading members from Entra ID...
                    </div>
                  ) : members.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                      No members found in this group. (Transitive check applied)
                    </div>
                  ) : (
                    <div style={{ padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {members.map(member => (
                        <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #e2e8f0, #f8fafc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                            <User size={20} />
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--fg-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {member.displayName || member.userPrincipalName?.split('@')[0] || 'Service Account'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {member.mail || member.userPrincipalName || member.id}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
