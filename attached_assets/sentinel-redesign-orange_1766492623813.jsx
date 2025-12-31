import React, { useState } from 'react';
import { Search, Bell, ChevronDown, ChevronRight, Briefcase, FileText, Users, MessageSquare, Mic, FolderOpen, LayoutGrid, Settings, ArrowRight, Calendar, DollarSign, Target, Flag, Clock, Plus, Filter, MoreHorizontal, Eye, Lock, Trash2, Building2, Scale, AlertTriangle, CheckCircle2, Bookmark, ExternalLink, Sparkles, TrendingUp, Zap } from 'lucide-react';

// Main App Component with Tab Navigation
export default function SentinelRedesign() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const views = {
    dashboard: <DashboardView />,
    deal: <DealOverviewView />,
    cases: <CasesListView />,
    caseDetail: <CaseDetailView />,
    documents: <DocumentReviewView />
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0a0f 0%, #12121a 50%, #0d0d12 100%)',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      color: '#e8e6e3',
      display: 'flex'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(249,115,22,0.5); }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(249,115,22,0.3); }
          50% { border-color: rgba(249,115,22,0.6); }
        }
        
        .card-hover { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .card-hover:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(249,115,22,0.2);
        }
        
        .glow-text {
          background: linear-gradient(135deg, #f97316 0%, #fdba74 50%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .nav-item {
          transition: all 0.3s ease;
          position: relative;
        }
        .nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 0;
          background: linear-gradient(180deg, #f97316, #ea580c);
          border-radius: 0 4px 4px 0;
          transition: height 0.3s ease;
        }
        .nav-item:hover::before, .nav-item.active::before {
          height: 60%;
        }
        
        .metric-card {
          position: relative;
          overflow: hidden;
        }
        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent);
        }
        
        .table-row {
          transition: all 0.2s ease;
        }
        .table-row:hover {
          background: rgba(249,115,22,0.05);
        }
        
        .tab-active {
          position: relative;
        }
        .tab-active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #f97316, #ea580c);
        }
        
        .input-glow:focus {
          box-shadow: 0 0 0 2px rgba(249,115,22,0.2), 0 0 20px rgba(249,115,22,0.1);
        }
        
        .badge-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .stagger-1 { animation: fadeSlideUp 0.5s ease forwards; animation-delay: 0.1s; opacity: 0; }
        .stagger-2 { animation: fadeSlideUp 0.5s ease forwards; animation-delay: 0.2s; opacity: 0; }
        .stagger-3 { animation: fadeSlideUp 0.5s ease forwards; animation-delay: 0.3s; opacity: 0; }
        .stagger-4 { animation: fadeSlideUp 0.5s ease forwards; animation-delay: 0.4s; opacity: 0; }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? '72px' : '260px',
        background: 'linear-gradient(180deg, rgba(18,18,26,0.98) 0%, rgba(10,10,15,0.98) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? '24px 16px' : '24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Scale size={20} color="#0a0a0f" strokeWidth={2.5} />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ 
                fontFamily: "'Playfair Display', serif",
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '-0.02em'
              }}>
                Sentinel
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}>
                Counsel LLP
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ padding: '16px 8px', flex: 1 }}>
          <NavSection title="COMMAND CENTER" collapsed={sidebarCollapsed}>
            <NavItem 
              icon={<LayoutGrid size={18} />} 
              label="Dashboard" 
              active={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
              collapsed={sidebarCollapsed}
              badge="3"
            />
          </NavSection>

          <NavSection title="INVESTIGATIONS" collapsed={sidebarCollapsed}>
            <NavItem 
              icon={<Briefcase size={18} />} 
              label="Cases" 
              onClick={() => setActiveView('cases')}
              active={activeView === 'cases' || activeView === 'caseDetail'}
              collapsed={sidebarCollapsed}
            />
            <NavItem 
              icon={<FileText size={18} />} 
              label="Documents" 
              onClick={() => setActiveView('documents')}
              active={activeView === 'documents'}
              collapsed={sidebarCollapsed}
            />
            <NavItem icon={<MessageSquare size={18} />} label="Communications" collapsed={sidebarCollapsed} />
            <NavItem icon={<Mic size={18} />} label="Interviews" collapsed={sidebarCollapsed} />
          </NavSection>

          <NavSection title="TRANSACTIONS" collapsed={sidebarCollapsed}>
            <NavItem 
              icon={<Building2 size={18} />} 
              label="Deals" 
              onClick={() => setActiveView('deal')}
              active={activeView === 'deal'}
              collapsed={sidebarCollapsed}
            />
            <NavItem icon={<FolderOpen size={18} />} label="Data Rooms" collapsed={sidebarCollapsed} />
          </NavSection>
        </nav>

        {/* User Profile */}
        <div style={{
          padding: sidebarCollapsed ? '16px' : '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2a5a8a 0%, #1e3d5c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 600,
            flexShrink: 0
          }}>
            FQ
          </div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Frank Quesada</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Partner</div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <header style={{
          height: '64px',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,15,0.6)',
          backdropFilter: 'blur(20px)'
        }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px',
            padding: '10px 16px',
            width: '360px',
            border: '1px solid rgba(255,255,255,0.06)',
            transition: 'all 0.3s ease'
          }} className="input-glow">
            <Search size={16} color="rgba(255,255,255,0.4)" />
            <input
              type="text"
              placeholder="Search matters, documents, parties..."
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#e8e6e3',
                fontSize: '13px',
                width: '100%'
              }}
            />
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '2px 6px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '4px',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.4)'
            }}>
              ⌘K
            </div>
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* AI Assistant Button */}
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.1) 100%)',
              border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: '8px',
              color: '#f97316',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <Sparkles size={16} />
              Ask Emma
            </button>
            
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <Bell size={18} color="rgba(255,255,255,0.6)" />
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#f97316'
              }} className="badge-pulse" />
            </button>

            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              <Settings size={18} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        </header>

        {/* View Switcher for Demo */}
        <div style={{
          padding: '12px 32px',
          background: 'rgba(249,115,22,0.05)',
          borderBottom: '1px solid rgba(249,115,22,0.1)',
          display: 'flex',
          gap: '8px',
          fontSize: '12px'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Preview:</span>
          {['dashboard', 'deal', 'cases', 'caseDetail', 'documents'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                background: activeView === view ? 'rgba(249,115,22,0.2)' : 'transparent',
                color: activeView === view ? '#f97316' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '12px'
              }}
            >
              {view === 'caseDetail' ? 'Case Detail' : view}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
          {views[activeView]}
        </div>
      </main>
    </div>
  );
}

// Navigation Components
function NavSection({ title, children, collapsed }) {
  if (collapsed) return <div style={{ marginBottom: '16px' }}>{children}</div>;
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.3)',
        padding: '0 12px',
        marginBottom: '8px'
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed, badge }) {
  return (
    <button
      onClick={onClick}
      className={`nav-item ${active ? 'active' : ''}`}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: collapsed ? '12px' : '10px 12px',
        marginBottom: '2px',
        background: active ? 'rgba(249,115,22,0.08)' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: active ? '#f97316' : 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        justifyContent: collapsed ? 'center' : 'flex-start',
        textAlign: 'left'
      }}
    >
      {icon}
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && badge && (
        <span style={{
          padding: '2px 8px',
          background: 'rgba(249,115,22,0.2)',
          borderRadius: '10px',
          fontSize: '11px',
          color: '#f97316',
          fontWeight: 600
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// Dashboard View
function DashboardView() {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }} className="stagger-1">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '8px' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-0.02em'
          }}>
            Good morning, Frank
          </h1>
          <span style={{ 
            fontSize: '14px', 
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '6px'
          }}>
            Monday, December 22
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          You have <span className="glow-text" style={{ fontWeight: 600 }}>3 priority items</span> requiring your attention
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '32px'
      }} className="stagger-2">
        <StatCard 
          icon={<Briefcase size={20} />}
          label="Active Cases"
          value="12"
          trend="+2 this week"
          color="#f97316"
        />
        <StatCard 
          icon={<Building2 size={20} />}
          label="Open Deals"
          value="$8.4M"
          trend="3 transactions"
          color="#fb923c"
        />
        <StatCard 
          icon={<FileText size={20} />}
          label="Pending Review"
          value="847"
          trend="Documents"
          color="#60a5fa"
        />
        <StatCard 
          icon={<AlertTriangle size={20} />}
          label="Urgent Items"
          value="3"
          trend="Action required"
          color="#f87171"
        />
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '24px'
      }}>
        {/* Priority Tasks */}
        <div className="card-hover stagger-3" style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(248,113,113,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={16} color="#f87171" />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Priority Tasks</h2>
            </div>
            <button style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              View All
            </button>
          </div>
          
          <div style={{ padding: '12px' }}>
            <TaskItem 
              title="Review LOI - LeJeune Property"
              subtitle="Deal • Due in 2 days"
              priority="high"
            />
            <TaskItem 
              title="Complete Interview Summary"
              subtitle="Case CASE-2025-0071 • Overdue"
              priority="urgent"
            />
            <TaskItem 
              title="Document Production Response"
              subtitle="Safety PPE v. HOBAO • Due tomorrow"
              priority="medium"
            />
          </div>
        </div>

        {/* Recent Activity & Quick Access */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Continue Where You Left Off */}
          <div className="card-hover stagger-4" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <Clock size={16} color="#f97316" />
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Continue Where You Left Off</h3>
            </div>
            
            <RecentItem 
              title="4601 LeJeune - Lot and Building"
              type="Deal"
              time="2 hours ago"
            />
            <RecentItem 
              title="Sentinel Investigation"
              type="Case"
              time="Yesterday"
            />
            <RecentItem 
              title="Safety PPE v. HOBAO"
              type="Case"
              time="2 days ago"
            />
          </div>

          {/* Bookmarks */}
          <div className="card-hover" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <Bookmark size={16} color="#60a5fa" />
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Quick Access</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Deal Templates', 'Request Lists', 'Data Rooms'].map(item => (
                <button key={item} style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }) {
  return (
    <div className="card-hover metric-card" style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '20px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        color: color
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{label}</div>
      <div style={{ 
        fontSize: '11px', 
        color: color,
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <TrendingUp size={12} />
        {trend}
      </div>
    </div>
  );
}

function TaskItem({ title, subtitle, priority }) {
  const colors = {
    urgent: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', dot: '#f87171' },
    high: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', dot: '#fbbf24' },
    medium: { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)', dot: '#60a5fa' }
  };
  const c = colors[priority];
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '10px',
      marginBottom: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: c.dot,
        flexShrink: 0
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{subtitle}</div>
      </div>
      <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
    </div>
  );
}

function RecentItem({ title, type, time }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      cursor: 'pointer'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        background: 'rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {type === 'Deal' ? <Building2 size={14} color="rgba(255,255,255,0.5)" /> : <Briefcase size={14} color="rgba(255,255,255,0.5)" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{type} • {time}</div>
      </div>
      <ExternalLink size={14} color="rgba(255,255,255,0.3)" />
    </div>
  );
}

// Deal Overview View
function DealOverviewView() {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div>
      {/* Breadcrumb & Header */}
      <div className="stagger-1">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '12px',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '16px'
        }}>
          <span>Transactions</span>
          <ChevronRight size={14} />
          <span>Active Deals</span>
          <ChevronRight size={14} />
          <span style={{ color: '#f97316' }}>DEAL-2025-0002</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '28px',
              fontWeight: 600,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              4601 LeJeune - Lot and Building
              <span style={{
                padding: '4px 10px',
                background: 'rgba(251,146,60,0.15)',
                border: '1px solid rgba(251,146,60,0.3)',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#fb923c',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Active</span>
              <span style={{
                padding: '4px 10px',
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#fbbf24',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Medium Priority</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Real Estate Acquisition • Cafe Vialetto building near Merrick Park
            </p>
          </div>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#0a0a0f',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            Edit Deal
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }} className="stagger-2">
        <MetricBox icon={<DollarSign size={18} />} label="Deal Value" value="$2,100,000" color="#fb923c" />
        <MetricBox icon={<Calendar size={18} />} label="Target Close" value="Jan 31, 2026" color="#60a5fa" />
        <MetricBox icon={<Users size={18} />} label="Participants" value="0" color="#a78bfa" />
        <MetricBox icon={<Flag size={18} />} label="Milestones" value="0" color="#f472b6" />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '24px'
      }} className="stagger-3">
        {['Overview', 'Deal Terms', 'Parties', 'Milestones', 'Data Room', 'Documents', 'Checklists', 'Research'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={activeTab === tab.toLowerCase() ? 'tab-active' : ''}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              color: activeTab === tab.toLowerCase() ? '#f97316' : 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: '24px'
      }}>
        {/* Deal Details */}
        <div className="card-hover stagger-3" style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '24px'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Building2 size={18} color="#f97316" />
            Deal Details
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <DetailItem label="Deal Type" value="Real Estate" />
            <DetailItem label="Sub-Type" value="—" />
            <DetailItem label="Currency" value="USD" />
            <DetailItem label="Structure" value="—" />
          </div>
          
          <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ 
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Description</div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
              Buying Cafe Vialetto building near Merrick Park
            </p>
          </div>
        </div>

        {/* Key Dates */}
        <div className="card-hover stagger-4" style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '24px'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Clock size={18} color="#60a5fa" />
            Key Dates
          </h3>
          
          <DateItem label="LOI Date" value="—" />
          <DateItem label="Signing Target" value="—" />
          <DateItem label="Closing Target" value="Jan 31, 2026" highlighted />
          <DateItem label="Exclusivity Expires" value="—" />
          <DateItem label="Created" value="Dec 21, 2025" />
        </div>
      </div>
    </div>
  );
}

function MetricBox({ icon, label, value, color }) {
  return (
    <div className="metric-card" style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div style={{ 
        fontSize: '11px', 
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function DateItem({ label, value, highlighted }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)'
    }}>
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <span style={{ 
        fontSize: '13px', 
        fontWeight: highlighted ? 600 : 400,
        color: highlighted ? '#f97316' : 'rgba(255,255,255,0.8)'
      }}>{value}</span>
    </div>
  );
}

// Cases List View
function CasesListView() {
  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '32px'
      }} className="stagger-1">
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '28px',
            fontWeight: 600,
            marginBottom: '8px'
          }}>
            Cases
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Track and manage compliance investigation cases
          </p>
        </div>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          border: 'none',
          borderRadius: '8px',
          color: '#0a0a0f',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          <Plus size={16} />
          Create Case
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px'
      }} className="stagger-2">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          flex: 1,
          maxWidth: '280px'
        }}>
          <Search size={16} color="rgba(255,255,255,0.4)" />
          <input
            placeholder="Search by case number..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#e8e6e3',
              fontSize: '13px',
              width: '100%'
            }}
          />
        </div>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '13px',
          cursor: 'pointer'
        }}>
          <Filter size={16} />
          Filters
        </button>
      </div>

      {/* Active Cases Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(249,115,22,0.1)',
        border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: '6px',
        marginBottom: '20px',
        fontSize: '13px'
      }} className="stagger-2">
        <Briefcase size={14} color="#f97316" />
        <span style={{ color: '#f97316', fontWeight: 600 }}>Active Cases (6)</span>
      </div>

      {/* Table */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden'
      }} className="stagger-3">
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 120px 100px 100px 120px 100px',
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <div>Case Number</div>
          <div>Title</div>
          <div>Type</div>
          <div>Priority</div>
          <div>Status</div>
          <div>Created</div>
          <div>Actions</div>
        </div>
        
        {/* Table Rows */}
        <CaseRow 
          number="CASE-2025-0071"
          title="TEST - Sentinel Investigation"
          subtitle="Whether Steve stole Bob's sandwich"
          type="Antitrust"
          priority="medium"
          status="alert"
          created="Dec 3, 2025"
        />
        <CaseRow 
          number="CASE-2025-0051"
          title="Safety PPE v. HOBAO"
          type="Other"
          priority="low"
          status="alert"
          created="Dec 2, 2025"
        />
        <CaseRow 
          number="CASE-2025-0031"
          title="Investigation: Compliance Issue"
          subtitle="Test case for jump to document"
          type="Other"
          priority="medium"
          status="alert"
          created="Dec 2, 2025"
        />
        <CaseRow 
          number="CASE-2025-0021"
          title="Safety PPE v. Skanda"
          subtitle="Litigation by Safety PPE v. Skanda"
          type="Other"
          priority="low"
          status="alert"
          created="Dec 2, 2025"
        />
      </div>
    </div>
  );
}

function CaseRow({ number, title, subtitle, type, priority, status, created }) {
  const priorityColors = {
    high: { bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
    medium: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
    low: { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa' }
  };
  const p = priorityColors[priority];
  
  return (
    <div className="table-row" style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr 120px 100px 100px 120px 100px',
      padding: '16px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      alignItems: 'center',
      cursor: 'pointer'
    }}>
      <div style={{ 
        fontSize: '12px', 
        fontFamily: "'JetBrains Mono', monospace",
        color: '#f97316'
      }}>{number}</div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{title}</div>
        {subtitle && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{type}</div>
      <div>
        <span style={{
          padding: '4px 10px',
          background: p.bg,
          borderRadius: '4px',
          fontSize: '11px',
          color: p.text,
          fontWeight: 500
        }}>{priority}</span>
      </div>
      <div>
        <span style={{
          padding: '4px 10px',
          background: 'rgba(251,191,36,0.15)',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#fbbf24',
          fontWeight: 500
        }}>{status}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{created}</div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <ActionButton icon={<Eye size={14} />} />
        <ActionButton icon={<Lock size={14} />} />
        <ActionButton icon={<Trash2 size={14} />} />
      </div>
    </div>
  );
}

function ActionButton({ icon }) {
  return (
    <button style={{
      width: '28px',
      height: '28px',
      borderRadius: '6px',
      background: 'rgba(255,255,255,0.04)',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'rgba(255,255,255,0.5)'
    }}>
      {icon}
    </button>
  );
}

// Case Detail View
function CaseDetailView() {
  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '16px'
      }} className="stagger-1">
        <span style={{ cursor: 'pointer' }}>← Back to Cases</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '32px' }} className="stagger-1">
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ 
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#f97316',
              marginBottom: '8px'
            }}>
              CASE-2025-0071
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '28px',
              fontWeight: 600,
              marginBottom: '12px'
            }}>
              TEST - Sentinel Investigation
            </h1>
          </div>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.1) 100%)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: '8px',
            color: '#f97316',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}>
            <Sparkles size={16} />
            Ask Emma
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '24px'
      }} className="stagger-2">
        {['Overview', 'Evidence', 'Parties & Custodians', 'Interviews', 'Timeline', 'Findings', 'Applicable Law'].map((tab, i) => (
          <button
            key={tab}
            className={i === 0 ? 'tab-active' : ''}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              color: i === 0 ? '#f97316' : 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '24px'
      }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Case Snapshot */}
          <div className="card-hover stagger-3" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Target size={18} color="#f97316" />
                Case Snapshot
              </h3>
              <button style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                Edit
              </button>
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Allegations / Issue Summary</div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
              Whether Steve stole Bob's sandwich
            </p>
          </div>

          {/* AI Summary */}
          <div className="card-hover stagger-4" style={{
            background: 'linear-gradient(180deg, rgba(249,115,22,0.05) 0%, rgba(249,115,22,0.02) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(249,115,22,0.15)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Sparkles size={18} color="#f97316" />
                <span className="glow-text">AI Case Summary & Laws</span>
              </h3>
              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: '6px',
                color: '#f97316',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                Regenerate
              </button>
            </div>
            
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Narrative Summary</div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: '20px' }}>
              The Sentinel Investigation case concerns a potential antitrust violation related to an alleged act involving the theft of Bob's sandwich by Steve. While the incident appears trivial in nature, it is under scrutiny due to its possible implications in fostering an unfair competitive advantage and inhibiting competition in the context of workplace dynamics.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '16px',
              padding: '16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '10px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Interviews</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>3</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Communications</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>0</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Status</div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 500,
                  color: '#fbbf24'
                }}>Alert</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Document Sets */}
          <div className="card-hover stagger-3" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={16} color="#60a5fa" />
                Document Sets
              </h3>
              <span style={{ fontSize: '12px', color: '#f97316', cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{
              padding: '32px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '10px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '13px'
            }}>
              No document sets yet
            </div>
          </div>

          {/* Parties & Custodians */}
          <div className="card-hover stagger-4" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="#a78bfa" />
                Parties & Custodians
              </h3>
              <span style={{ fontSize: '12px', color: '#f97316', cursor: 'pointer' }}>View all →</span>
            </div>
            
            <PartyItem name="Charlie Croissant" role="employee" type="witness" />
            <PartyItem name="Bob Peanuts" role="employee" type="bystander" />
            <PartyItem name="Steve" role="employee" type="subject" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PartyItem({ name, role, type }) {
  const typeColors = {
    witness: '#60a5fa',
    bystander: '#a78bfa',
    subject: '#f87171'
  };
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 600
      }}>
        {name.split(' ').map(n => n[0]).join('')}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{name}</div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <span style={{
            padding: '2px 8px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '4px',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.5)'
          }}>{role}</span>
          <span style={{
            padding: '2px 8px',
            background: `${typeColors[type]}15`,
            borderRadius: '4px',
            fontSize: '10px',
            color: typeColors[type]
          }}>{type}</span>
        </div>
      </div>
    </div>
  );
}

// Document Review View
function DocumentReviewView() {
  return (
    <div style={{ display: 'flex', gap: '0', height: 'calc(100vh - 180px)', margin: '-32px', marginTop: '-32px' }}>
      {/* Left Panel - Document List */}
      <div style={{
        width: '280px',
        background: 'rgba(0,0,0,0.3)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <button style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: '6px',
              color: '#f97316',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <FileText size={14} />
              Document
            </button>
            <button style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              List
            </button>
          </div>
          
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '8px'
          }}>
            Navigation
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button style={{
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              cursor: 'pointer'
            }}>← Prev</button>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>1 of 3797</span>
            <button style={{
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              cursor: 'pointer'
            }}>Next →</button>
          </div>
        </div>
        
        <div style={{ padding: '16px' }}>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Filters</div>
          <button style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: '8px'
          }}>
            <Users size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Employees
          </button>
          <button style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            cursor: 'pointer',
            textAlign: 'left'
          }}>
            <Building2 size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Departments
          </button>
        </div>
      </div>

      {/* Center Panel - Document Viewer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Document Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                padding: '4px 10px',
                background: 'rgba(96,165,250,0.15)',
                border: '1px solid rgba(96,165,250,0.3)',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#60a5fa'
              }}>USA WP TEST</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)'
              }}>CASE-2025-0201</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                cursor: 'pointer'
              }}>Print/PDF</button>
              <button style={{
                padding: '8px 14px',
                background: 'rgba(251,146,60,0.15)',
                border: '1px solid rgba(251,146,60,0.3)',
                borderRadius: '6px',
                color: '#fb923c',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Bookmark size={14} />
                Bookmarked
              </button>
            </div>
          </div>
          
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Replit: Water Polo has used 100% of Credits
          </h2>
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)'
          }}>
            <span>From: "Replit" &lt;notifications@replit.com&gt;</span>
            <span>Nov 30, 2025 6:39 AM</span>
            <span>To: frank.quesada@gmail.com</span>
          </div>
        </div>

        {/* Review Status */}
        <div style={{
          padding: '12px 24px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '24px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>3797 Unreviewed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>0 In Progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fb923c' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>0 Reviewed</span>
          </div>
        </div>

        {/* Document Content */}
        <div style={{ 
          flex: 1, 
          padding: '32px',
          overflow: 'auto',
          background: 'rgba(20,20,30,0.5)'
        }}>
          <div style={{
            maxWidth: '700px',
            margin: '0 auto',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '40px'
          }}>
            <p style={{ fontSize: '15px', lineHeight: 1.8, marginBottom: '24px' }}>
              Hi Frank quesada,
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.8, marginBottom: '24px', fontWeight: 600 }}>
              Water Polo has used 100% of Credits
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.8, marginBottom: '24px' }}>
              You have used 100% of your credits from your Water Polo plan for the current month. Your team will be billed at the standard rate for your usage. Adding a new seat will replinish your credits. To set a spending limit, visit your usage page.
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#60a5fa' }}>
              View Usage [https://replit.com/t/water-polo/usage]
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Coding */}
      <div style={{
        width: '320px',
        background: 'rgba(0,0,0,0.3)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Document Coding</h3>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>1 of 3797</div>
        </div>
        
        <div style={{ padding: '16px 20px' }}>
          <button style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(96,165,250,0.1)',
            border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: '8px',
            color: '#60a5fa',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}>
            <Eye size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Next Unreviewed
          </button>
          
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Quick Tags</div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            <span style={{
              padding: '6px 12px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#ef4444',
              cursor: 'pointer'
            }}>Trump</span>
          </div>
          
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}>
            <Plus size={14} />
            Quick Add
            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)' }}>Manage Tags</span>
          </button>
          
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Annotations</div>
          
          <textarea 
            placeholder="Add notes about this document... Type @ to mention a user"
            style={{
              width: '100%',
              height: '100px',
              padding: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#e8e6e3',
              fontSize: '13px',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Compliance Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#fb923c' }}>92</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/ 100</span>
            <span style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              background: 'rgba(251,146,60,0.15)',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#fb923c',
              fontWeight: 500
            }}>LOW RISK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
