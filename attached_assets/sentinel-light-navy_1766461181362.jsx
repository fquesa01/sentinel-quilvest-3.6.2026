import React, { useState } from 'react';
import { Search, Bell, ChevronDown, ChevronRight, Briefcase, FileText, Users, MessageSquare, Mic, FolderOpen, LayoutGrid, Settings, ArrowRight, Calendar, DollarSign, Target, Flag, Clock, Plus, Filter, MoreHorizontal, Eye, Lock, Trash2, Building2, Scale, AlertTriangle, CheckCircle2, Bookmark, ExternalLink, Sparkles, TrendingUp, Zap, Sun, Moon } from 'lucide-react';

export default function SentinelLightRedesign() {
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
      background: '#f8fafc',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      color: '#1e293b',
      display: 'flex'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .card-hover { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .card-hover:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 20px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(30,64,175,0.1);
        }
        
        .glow-text {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .nav-item {
          transition: all 0.2s ease;
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
          background: linear-gradient(180deg, #1e40af, #1e3a8a);
          border-radius: 0 4px 4px 0;
          transition: height 0.2s ease;
        }
        .nav-item:hover::before, .nav-item.active::before {
          height: 60%;
        }
        
        .table-row { transition: all 0.15s ease; }
        .table-row:hover { background: #eff6ff; }
        
        .tab-active { position: relative; }
        .tab-active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #1e40af, #1e3a8a);
        }
        
        .input-glow:focus-within {
          box-shadow: 0 0 0 3px rgba(30,64,175,0.15);
          border-color: #1e40af;
        }
        
        .stagger-1 { animation: fadeSlideUp 0.5s ease forwards; animation-delay: 0.1s; opacity: 0; }
        .stagger-2 { animation: fadeSlideUp 0.5s ease forwards; animation-delay: 0.2s; opacity: 0; }
        .stagger-3 { animation: fadeSlideUp 0.5s ease forwards; animation-delay: 0.3s; opacity: 0; }
        .stagger-4 { animation: fadeSlideUp 0.5s ease forwards; animation-delay: 0.4s; opacity: 0; }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? '72px' : '260px',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? '24px 16px' : '24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(30,64,175,0.3)'
          }}>
            <Scale size={20} color="#ffffff" strokeWidth={2.5} />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ 
                fontFamily: "'Playfair Display', serif",
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#0f172a'
              }}>
                Sentinel
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#94a3b8',
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
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            flexShrink: 0
          }}>
            FQ
          </div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>Frank Quesada</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Partner</div>
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
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff'
        }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#f8fafc',
            borderRadius: '10px',
            padding: '10px 16px',
            width: '360px',
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s ease'
          }} className="input-glow">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search matters, documents, parties..."
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#1e293b',
                fontSize: '13px',
                width: '100%'
              }}
            />
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '2px 6px',
              background: '#e2e8f0',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#64748b'
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
              background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30,64,175,0.3)',
              transition: 'all 0.2s ease'
            }}>
              <Sparkles size={16} />
              Ask Emma
            </button>
            
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <Bell size={18} color="#64748b" />
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#1e40af',
                border: '2px solid #ffffff'
              }} />
            </button>

            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              <Settings size={18} color="#64748b" />
            </button>
          </div>
        </header>

        {/* View Switcher for Demo */}
        <div style={{
          padding: '12px 32px',
          background: '#eff6ff',
          borderBottom: '1px solid #bfdbfe',
          display: 'flex',
          gap: '8px',
          fontSize: '12px'
        }}>
          <span style={{ color: '#64748b' }}>Preview:</span>
          {['dashboard', 'deal', 'cases', 'caseDetail', 'documents'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                background: activeView === view ? '#1e40af' : 'transparent',
                color: activeView === view ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '12px',
                fontWeight: activeView === view ? 500 : 400
              }}
            >
              {view === 'caseDetail' ? 'Case Detail' : view}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px', background: '#f8fafc' }}>
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
        color: '#94a3b8',
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
        background: active ? '#eff6ff' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: active ? '#1e40af' : '#64748b',
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
          background: '#dbeafe',
          borderRadius: '10px',
          fontSize: '11px',
          color: '#1e40af',
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
            letterSpacing: '-0.02em',
            color: '#0f172a'
          }}>
            Good morning, Frank
          </h1>
          <span style={{ 
            fontSize: '14px', 
            color: '#94a3b8',
            marginBottom: '6px'
          }}>
            Monday, December 22
          </span>
        </div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
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
        <StatCard icon={<Briefcase size={20} />} label="Active Cases" value="12" trend="+2 this week" color="#1e40af" />
        <StatCard icon={<Building2 size={20} />} label="Open Deals" value="$8.4M" trend="3 transactions" color="#3b82f6" />
        <StatCard icon={<FileText size={20} />} label="Pending Review" value="847" trend="Documents" color="#8b5cf6" />
        <StatCard icon={<AlertTriangle size={20} />} label="Urgent Items" value="3" trend="Action required" color="#f59e0b" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Priority Tasks */}
        <div className="card-hover stagger-3" style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={16} color="#f59e0b" />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Priority Tasks</h2>
            </div>
            <button style={{
              padding: '6px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              View All
            </button>
          </div>
          
          <div style={{ padding: '12px' }}>
            <TaskItem title="Review LOI - LeJeune Property" subtitle="Deal • Due in 2 days" priority="high" />
            <TaskItem title="Complete Interview Summary" subtitle="Case CASE-2025-0071 • Overdue" priority="urgent" />
            <TaskItem title="Document Production Response" subtitle="Safety PPE v. HOBAO • Due tomorrow" priority="medium" />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Continue Where You Left Off */}
          <div className="card-hover stagger-4" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Clock size={16} color="#1e40af" />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Continue Where You Left Off</h3>
            </div>
            
            <RecentItem title="4601 LeJeune - Lot and Building" type="Deal" time="2 hours ago" />
            <RecentItem title="Sentinel Investigation" type="Case" time="Yesterday" />
            <RecentItem title="Safety PPE v. HOBAO" type="Case" time="2 days ago" />
          </div>

          {/* Bookmarks */}
          <div className="card-hover" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Bookmark size={16} color="#3b82f6" />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Quick Access</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Deal Templates', 'Request Lists', 'Data Rooms'].map(item => (
                <button key={item} style={{
                  padding: '8px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#475569',
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
    <div className="card-hover" style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${color}, ${color}80)`
      }} />
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
      <div style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px', color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
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
    urgent: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', text: '#b91c1c' },
    high: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', text: '#b45309' },
    medium: { bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', text: '#1d4ed8' }
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
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px', color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{subtitle}</div>
      </div>
      <ChevronRight size={16} color="#94a3b8" />
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
      borderBottom: '1px solid #f1f5f9',
      cursor: 'pointer'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {type === 'Deal' ? <Building2 size={14} color="#64748b" /> : <Briefcase size={14} color="#64748b" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{type} • {time}</div>
      </div>
      <ExternalLink size={14} color="#94a3b8" />
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
          color: '#94a3b8',
          marginBottom: '16px'
        }}>
          <span>Transactions</span>
          <ChevronRight size={14} />
          <span>Active Deals</span>
          <ChevronRight size={14} />
          <span style={{ color: '#1e40af' }}>DEAL-2025-0002</span>
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
              gap: '12px',
              color: '#0f172a'
            }}>
              4601 LeJeune - Lot and Building
              <span style={{
                padding: '4px 10px',
                background: '#dbeafe',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#1e40af',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Active</span>
              <span style={{
                padding: '4px 10px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#b45309',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Medium Priority</span>
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Real Estate Acquisition • Cafe Vialetto building near Merrick Park
            </p>
          </div>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(30,64,175,0.3)'
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
        <MetricBox icon={<DollarSign size={18} />} label="Deal Value" value="$2,100,000" color="#1e40af" />
        <MetricBox icon={<Calendar size={18} />} label="Target Close" value="Jan 31, 2026" color="#3b82f6" />
        <MetricBox icon={<Users size={18} />} label="Participants" value="0" color="#8b5cf6" />
        <MetricBox icon={<Flag size={18} />} label="Milestones" value="0" color="#ec4899" />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '24px',
        background: '#ffffff',
        borderRadius: '12px 12px 0 0',
        padding: '0 8px'
      }} className="stagger-3">
        {['Overview', 'Deal Terms', 'Parties', 'Milestones', 'Data Room', 'Documents', 'Checklists', 'Research'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={activeTab === tab.toLowerCase() ? 'tab-active' : ''}
            style={{
              padding: '14px 20px',
              background: 'none',
              border: 'none',
              color: activeTab === tab.toLowerCase() ? '#1e40af' : '#64748b',
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
        {/* Deal Details */}
        <div className="card-hover stagger-3" style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#0f172a'
          }}>
            <Building2 size={18} color="#1e40af" />
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
            borderTop: '1px solid #f1f5f9'
          }}>
            <div style={{ 
              fontSize: '12px', 
              color: '#94a3b8',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Description</div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
              Buying Cafe Vialetto building near Merrick Park
            </p>
          </div>
        </div>

        {/* Key Dates */}
        <div className="card-hover stagger-4" style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#0f172a'
          }}>
            <Clock size={18} color="#3b82f6" />
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
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
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
        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{value}</div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div style={{ 
        fontSize: '11px', 
        color: '#94a3b8',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{value}</div>
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
      borderBottom: '1px solid #f1f5f9'
    }}>
      <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
      <span style={{ 
        fontSize: '13px', 
        fontWeight: highlighted ? 600 : 400,
        color: highlighted ? '#1e40af' : '#0f172a'
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
            marginBottom: '8px',
            color: '#0f172a'
          }}>
            Cases
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Track and manage compliance investigation cases
          </p>
        </div>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
          border: 'none',
          borderRadius: '8px',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(30,64,175,0.3)'
        }}>
          <Plus size={16} />
          Create Case
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }} className="stagger-2">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          flex: 1,
          maxWidth: '280px'
        }}>
          <Search size={16} color="#94a3b8" />
          <input
            placeholder="Search by case number..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#1e293b',
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
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          color: '#64748b',
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
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        marginBottom: '20px',
        fontSize: '13px'
      }} className="stagger-2">
        <Briefcase size={14} color="#1e40af" />
        <span style={{ color: '#1e40af', fontWeight: 600 }}>Active Cases (6)</span>
      </div>

      {/* Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }} className="stagger-3">
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 120px 100px 100px 120px 100px',
          padding: '14px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '11px',
          fontWeight: 600,
          color: '#94a3b8',
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
        <CaseRow number="CASE-2025-0071" title="TEST - Sentinel Investigation" subtitle="Whether Steve stole Bob's sandwich" type="Antitrust" priority="medium" status="alert" created="Dec 3, 2025" />
        <CaseRow number="CASE-2025-0051" title="Safety PPE v. HOBAO" type="Other" priority="low" status="alert" created="Dec 2, 2025" />
        <CaseRow number="CASE-2025-0031" title="Investigation: Compliance Issue" subtitle="Test case for jump to document" type="Other" priority="medium" status="alert" created="Dec 2, 2025" />
        <CaseRow number="CASE-2025-0021" title="Safety PPE v. Skanda" subtitle="Litigation by Safety PPE v. Skanda" type="Other" priority="low" status="alert" created="Dec 2, 2025" />
      </div>
    </div>
  );
}

function CaseRow({ number, title, subtitle, type, priority, status, created }) {
  const priorityColors = {
    high: { bg: '#fef2f2', text: '#dc2626' },
    medium: { bg: '#fef3c7', text: '#b45309' },
    low: { bg: '#eff6ff', text: '#2563eb' }
  };
  const p = priorityColors[priority];
  
  return (
    <div className="table-row" style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr 120px 100px 100px 120px 100px',
      padding: '16px 20px',
      borderBottom: '1px solid #f1f5f9',
      alignItems: 'center',
      cursor: 'pointer'
    }}>
      <div style={{ 
        fontSize: '12px', 
        fontFamily: "'JetBrains Mono', monospace",
        color: '#1e40af',
        fontWeight: 500
      }}>{number}</div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{subtitle}</div>}
      </div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>{type}</div>
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
          background: '#fef3c7',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#b45309',
          fontWeight: 500
        }}>{status}</span>
      </div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>{created}</div>
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
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: '#64748b'
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
        color: '#94a3b8',
        marginBottom: '16px'
      }} className="stagger-1">
        <span style={{ cursor: 'pointer' }}>← Back to Cases</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '32px' }} className="stagger-1">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ 
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#1e40af',
              marginBottom: '8px',
              fontWeight: 500
            }}>
              CASE-2025-0071
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '28px',
              fontWeight: 600,
              marginBottom: '12px',
              color: '#0f172a'
            }}>
              TEST - Sentinel Investigation
            </h1>
          </div>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(30,64,175,0.3)'
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
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '24px',
        background: '#ffffff',
        borderRadius: '12px 12px 0 0',
        padding: '0 8px'
      }} className="stagger-2">
        {['Overview', 'Evidence', 'Parties & Custodians', 'Interviews', 'Timeline', 'Findings', 'Applicable Law'].map((tab, i) => (
          <button
            key={tab}
            className={i === 0 ? 'tab-active' : ''}
            style={{
              padding: '14px 20px',
              background: 'none',
              border: 'none',
              color: i === 0 ? '#1e40af' : '#64748b',
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Case Snapshot */}
          <div className="card-hover stagger-3" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#0f172a'
              }}>
                <Target size={18} color="#1e40af" />
                Case Snapshot
              </h3>
              <button style={{
                padding: '6px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                color: '#64748b',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                Edit
              </button>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#94a3b8',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Allegations / Issue Summary</div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
              Whether Steve stole Bob's sandwich
            </p>
          </div>

          {/* AI Summary */}
          <div className="card-hover stagger-4" style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #eff6ff 100%)',
            borderRadius: '16px',
            border: '1px solid #bfdbfe',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#0f172a'
              }}>
                <Sparkles size={18} color="#1e40af" />
                <span className="glow-text">AI Case Summary & Laws</span>
              </h3>
              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#ffffff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                color: '#1e40af',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                Regenerate
              </button>
            </div>
            
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Narrative Summary</div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, marginBottom: '20px' }}>
              The Sentinel Investigation case concerns a potential antitrust violation related to an alleged act involving the theft of Bob's sandwich by Steve. While the incident appears trivial in nature, it is under scrutiny due to its possible implications in fostering an unfair competitive advantage and inhibiting competition in the context of workplace dynamics.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '16px',
              padding: '16px',
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #dbeafe'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Interviews</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>3</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Communications</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>0</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Status</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#f59e0b' }}>Alert</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Document Sets */}
          <div className="card-hover stagger-3" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <FolderOpen size={16} color="#3b82f6" />
                Document Sets
              </h3>
              <span style={{ fontSize: '12px', color: '#1e40af', cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{
              padding: '32px',
              background: '#f8fafc',
              borderRadius: '10px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '13px',
              border: '1px dashed #e2e8f0'
            }}>
              No document sets yet
            </div>
          </div>

          {/* Parties & Custodians */}
          <div className="card-hover stagger-4" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <Users size={16} color="#8b5cf6" />
                Parties & Custodians
              </h3>
              <span style={{ fontSize: '12px', color: '#1e40af', cursor: 'pointer' }}>View all →</span>
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
    witness: { bg: '#eff6ff', text: '#2563eb' },
    bystander: { bg: '#f5f3ff', text: '#7c3aed' },
    subject: { bg: '#fef2f2', text: '#dc2626' }
  };
  const c = typeColors[type];
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid #f1f5f9'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 600,
        color: '#64748b'
      }}>
        {name.split(' ').map(n => n[0]).join('')}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{name}</div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <span style={{
            padding: '2px 8px',
            background: '#f1f5f9',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#64748b'
          }}>{role}</span>
          <span style={{
            padding: '2px 8px',
            background: c.bg,
            borderRadius: '4px',
            fontSize: '10px',
            color: c.text
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
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button style={{
              flex: 1,
              padding: '8px 12px',
              background: '#1e40af',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
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
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              List
            </button>
          </div>
          
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Navigation</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={{
              padding: '6px 10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer'
            }}>← Prev</button>
            <span style={{ fontSize: '12px', color: '#64748b' }}>1 of 3797</span>
            <button style={{
              padding: '6px 10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer'
            }}>Next →</button>
          </div>
        </div>
        
        <div style={{ padding: '16px' }}>
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Filters</div>
          <button style={{
            width: '100%',
            padding: '10px 12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            color: '#64748b',
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
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            color: '#64748b',
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        {/* Document Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '4px 10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#2563eb'
              }}>USA WP TEST</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: '#94a3b8'
              }}>CASE-2025-0201</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                padding: '8px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                color: '#64748b',
                fontSize: '12px',
                cursor: 'pointer'
              }}>Print/PDF</button>
              <button style={{
                padding: '8px 14px',
                background: '#dbeafe',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                color: '#1e40af',
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
          
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#0f172a' }}>
            Replit: Water Polo has used 100% of Credits
          </h2>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
            <span>From: "Replit" &lt;notifications@replit.com&gt;</span>
            <span>Nov 30, 2025 6:39 AM</span>
            <span>To: frank.quesada@gmail.com</span>
          </div>
        </div>

        {/* Review Status */}
        <div style={{
          padding: '12px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '24px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ color: '#64748b' }}>3797 Unreviewed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ color: '#64748b' }}>0 In Progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e40af' }} />
            <span style={{ color: '#64748b' }}>0 Reviewed</span>
          </div>
        </div>

        {/* Document Content */}
        <div style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
          <div style={{
            maxWidth: '700px',
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '40px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <p style={{ fontSize: '15px', lineHeight: 1.8, marginBottom: '24px', color: '#334155' }}>
              Hi Frank quesada,
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.8, marginBottom: '24px', fontWeight: 600, color: '#0f172a' }}>
              Water Polo has used 100% of Credits
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.8, marginBottom: '24px', color: '#334155' }}>
              You have used 100% of your credits from your Water Polo plan for the current month. Your team will be billed at the standard rate for your usage. Adding a new seat will replinish your credits. To set a spending limit, visit your usage page.
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#3b82f6' }}>
              View Usage [https://replit.com/t/water-polo/usage]
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Coding */}
      <div style={{
        width: '320px',
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#0f172a' }}>Document Coding</h3>
          <div style={{ fontSize: '12px', color: '#64748b' }}>1 of 3797</div>
        </div>
        
        <div style={{ padding: '16px 20px' }}>
          <button style={{
            width: '100%',
            padding: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            color: '#2563eb',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}>
            <Eye size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Next Unreviewed
          </button>
          
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Quick Tags</div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            <span style={{
              padding: '6px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#dc2626',
              cursor: 'pointer'
            }}>Trump</span>
          </div>
          
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#64748b',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '20px',
            width: '100%'
          }}>
            <Plus size={14} />
            Quick Add
            <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>Manage Tags</span>
          </button>
          
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
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
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '13px',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#eff6ff' }}>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Compliance Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#1e40af' }}>92</span>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ 100</span>
            <span style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              background: '#dbeafe',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#1e40af',
              fontWeight: 500
            }}>LOW RISK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
