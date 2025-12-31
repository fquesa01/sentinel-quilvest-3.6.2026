import React, { useState } from 'react';
import { Search, Bell, ChevronDown, ChevronRight, Briefcase, FileText, Users, MessageSquare, Inbox, FolderOpen, LayoutGrid, Settings, Calendar, DollarSign, Target, Flag, Clock, Plus, Filter, Eye, Lock, Trash2, Building2, Scale, AlertTriangle, CheckCircle2, Bookmark, ExternalLink, Sparkles, TrendingUp, Circle, CircleDot, CircleDashed, MoreHorizontal, Star, Link2, Copy, Paperclip, Send, AtSign, Hash, ChevronUp, PanelRight, Layers, GitBranch } from 'lucide-react';

export default function SentinelLinear() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const views = {
    dashboard: <ActiveIssuesView />,
    deal: <ProjectDetailView />,
    cases: <IssuesListView />,
    caseDetail: <IssueDetailView />,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#ebebef',
      display: 'flex',
      fontSize: '14px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #444; }
        
        ::selection { background: rgba(94, 106, 210, 0.3); }
        
        .linear-hover { transition: background 0.1s ease; }
        .linear-hover:hover { background: rgba(255,255,255,0.05); }
        
        .linear-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: 6px;
          color: #9898a0;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.1s ease;
        }
        .linear-nav-item:hover { background: rgba(255,255,255,0.05); color: #ebebef; }
        .linear-nav-item.active { background: rgba(255,255,255,0.08); color: #ebebef; }
        
        .linear-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          height: 32px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.1s ease;
          border: none;
          background: transparent;
        }
        
        .linear-btn-primary {
          background: #5e6ad2;
          color: #ffffff;
        }
        .linear-btn-primary:hover { background: #6872d9; }
        
        .linear-btn-ghost {
          color: #9898a0;
        }
        .linear-btn-ghost:hover { background: rgba(255,255,255,0.05); color: #ebebef; }
        
        .linear-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 4px;
          background: rgba(255,255,255,0.06);
          color: #ebebef;
        }
        
        .linear-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 8px 12px;
          color: #ebebef;
          font-size: 14px;
          outline: none;
          transition: all 0.1s ease;
        }
        .linear-input:focus {
          border-color: #5e6ad2;
          background: rgba(255,255,255,0.08);
        }
        .linear-input::placeholder { color: #5c5c66; }
        
        .linear-table-row { transition: background 0.05s ease; }
        .linear-table-row:hover { background: rgba(255,255,255,0.03); }
        
        .fade-in {
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: '#0f0f10',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Workspace Switcher */}
        <div style={{
          padding: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#ebebef'
          }} className="linear-hover">
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #5e6ad2 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff'
            }}>
              SL
            </div>
            <span style={{ fontWeight: 500, flex: 1, textAlign: 'left' }}>Sentinel Legal</span>
            <ChevronDown size={14} color="#5c5c66" />
          </button>
        </div>

        {/* Search & Create */}
        <div style={{ padding: '12px', display: 'flex', gap: '8px' }}>
          <button style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: '#5c5c66',
            fontSize: '13px',
            cursor: 'pointer'
          }}>
            <Search size={14} />
            Search
          </button>
          <button style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#5e6ad2',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            <Plus size={16} color="#fff" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav style={{ padding: '0 8px', flex: 1 }}>
          <div className="linear-nav-item" onClick={() => setActiveView('dashboard')}>
            <Inbox size={16} />
            Inbox
          </div>
          <div className={`linear-nav-item ${activeView === 'cases' ? 'active' : ''}`} onClick={() => setActiveView('cases')}>
            <CircleDot size={16} />
            My Issues
          </div>

          {/* Workspace Section */}
          <div style={{ marginTop: '24px', marginBottom: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 12px',
              color: '#5c5c66',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <span>Workspace</span>
              <ChevronDown size={12} />
            </div>
          </div>
          
          <div className={`linear-nav-item ${activeView === 'deal' ? 'active' : ''}`} onClick={() => setActiveView('deal')}>
            <Layers size={16} />
            Projects
          </div>
          <div className="linear-nav-item">
            <Eye size={16} />
            Views
          </div>
          <div className="linear-nav-item">
            <MoreHorizontal size={16} />
            More
          </div>

          {/* Teams Section */}
          <div style={{ marginTop: '24px', marginBottom: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 12px',
              color: '#5c5c66',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <span>Your teams</span>
              <ChevronDown size={12} />
            </div>
          </div>

          <div style={{ padding: '0 4px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }} className="linear-hover">
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: '#5e6ad2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Scale size={12} color="#fff" />
              </div>
              <span style={{ fontSize: '14px', color: '#ebebef' }}>Litigation</span>
              <ChevronDown size={12} color="#5c5c66" style={{ marginLeft: 'auto' }} />
            </div>

            {/* Team Sub-items */}
            <div style={{ paddingLeft: '20px', marginTop: '4px' }}>
              <div className="linear-nav-item" style={{ padding: '5px 12px', fontSize: '13px' }}>
                <CircleDot size={14} />
                Issues
              </div>
              <div className="linear-nav-item" style={{ padding: '5px 12px', fontSize: '13px' }}>
                <Layers size={14} />
                Projects
              </div>
              <div className="linear-nav-item" style={{ padding: '5px 12px', fontSize: '13px' }}>
                <Eye size={14} />
                Views
              </div>
            </div>
          </div>

          {/* Try Section */}
          <div style={{ marginTop: '24px', marginBottom: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 12px',
              color: '#5c5c66',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <span>Try</span>
              <ChevronDown size={12} style={{ marginLeft: '4px' }} />
            </div>
          </div>

          <div className="linear-nav-item">
            <Plus size={16} />
            Import issues
          </div>
          <div className="linear-nav-item">
            <Users size={16} />
            Invite people
          </div>
        </nav>

        {/* Bottom Section */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '12px', color: '#9898a0', marginBottom: '2px' }}>What's new</div>
            <div style={{ fontSize: '13px', color: '#ebebef' }}>Team owners</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* View Switcher for Demo */}
        <div style={{
          padding: '8px 16px',
          background: 'rgba(94, 106, 210, 0.1)',
          borderBottom: '1px solid rgba(94, 106, 210, 0.2)',
          display: 'flex',
          gap: '8px',
          fontSize: '12px',
          alignItems: 'center'
        }}>
          <span style={{ color: '#5e6ad2', fontWeight: 500 }}>Preview:</span>
          {[
            { id: 'dashboard', label: 'Active Issues' },
            { id: 'deal', label: 'Project' },
            { id: 'cases', label: 'All Issues' },
            { id: 'caseDetail', label: 'Issue Detail' }
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                background: activeView === view.id ? '#5e6ad2' : 'transparent',
                color: activeView === view.id ? '#ffffff' : '#9898a0',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeView === view.id ? 500 : 400
              }}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }} className="fade-in">
          {views[activeView]}
        </div>
      </main>
    </div>
  );
}

// Active Issues View (Dashboard-like)
function ActiveIssuesView() {
  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <span style={{ color: '#9898a0' }}>Teams</span>
          <ChevronRight size={14} color="#5c5c66" />
        </nav>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
          {[
            { label: 'All issues', icon: <CircleDot size={14} /> },
            { label: 'Active', icon: <Circle size={14} />, active: true },
            { label: 'Backlog', icon: <CircleDashed size={14} /> },
          ].map(tab => (
            <button
              key={tab.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: tab.active ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: tab.active ? '#ebebef' : '#9898a0',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Right Actions */}
        <button className="linear-btn linear-btn-ghost">
          <Filter size={14} />
          Filter
        </button>
        <button className="linear-btn linear-btn-ghost">
          <Settings size={14} />
          Display
        </button>
      </div>

      {/* Empty State */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '24px'
        }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: `2px solid ${i <= 2 ? '#5c5c66' : '#3a3a42'}`,
              background: i === 2 || i === 4 ? 'rgba(255,255,255,0.05)' : 'transparent'
            }} />
          ))}
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#ebebef' }}>
          Active issues
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#9898a0',
          maxWidth: '400px',
          lineHeight: 1.5,
          marginBottom: '24px'
        }}>
          Active issues represent work that is currently in flight or should be worked on next. There are currently no active issues in this team. Once an issue moves to the Todo or In Progress state, it will show up here.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="linear-btn linear-btn-primary">
            Create new issue
            <span style={{
              marginLeft: '4px',
              padding: '2px 6px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '4px',
              fontSize: '11px'
            }}>C</span>
          </button>
          <button className="linear-btn" style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#ebebef'
          }}>
            Documentation
          </button>
        </div>
      </div>
    </div>
  );
}

// Project Detail View
function ProjectDetailView() {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Header */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <span style={{ color: '#9898a0' }}>Projects</span>
            <ChevronRight size={14} color="#5c5c66" />
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="#9898a0" />
              LeJeune Acquisition
            </span>
          </nav>
          <Star size={16} color="#5c5c66" style={{ cursor: 'pointer' }} />
          <MoreHorizontal size={16} color="#5c5c66" style={{ cursor: 'pointer' }} />

          <div style={{ flex: 1 }} />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['Overview', 'Updates', 'Issues'].map((tab, i) => (
              <button
                key={tab}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: i === 0 ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: i === 0 ? '#ebebef' : '#9898a0',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Project Content */}
        <div style={{ padding: '32px 24px', maxWidth: '720px' }}>
          {/* Icon & Title */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <Building2 size={24} color="#9898a0" />
          </div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            color: '#ebebef',
            marginBottom: '8px'
          }}>
            4601 LeJeune - Lot and Building
          </h1>

          <p style={{
            fontSize: '15px',
            color: '#5c5c66',
            marginBottom: '24px'
          }}>
            Add a short summary...
          </p>

          {/* Properties Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: '#5c5c66', fontSize: '14px', marginRight: '8px' }}>Properties</span>
            <StatusBadge status="backlog" />
            <PriorityBadge priority="none" />
            <PropertyPill icon={<Users size={14} />} label="Lead" />
            <PropertyPill icon={<Calendar size={14} />} label="Target date" />
            <TeamBadge name="Litigation" />
            <MoreHorizontal size={16} color="#5c5c66" style={{ cursor: 'pointer' }} />
          </div>

          {/* Resources */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ color: '#5c5c66', fontSize: '14px' }}>Resources</span>
            </div>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#5c5c66',
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              <Plus size={14} />
              Add document or link...
            </button>
          </div>

          {/* Write Update */}
          <div style={{
            padding: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9898a0' }}>
              <FileText size={18} />
              <span style={{ fontSize: '14px' }}>Write first project update</span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#ebebef', marginBottom: '12px' }}>
              Description
            </div>
            <div style={{
              padding: '12px',
              color: '#5c5c66',
              fontSize: '14px'
            }}>
              Add description...
            </div>
          </div>

          {/* Add Milestone */}
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            color: '#5c5c66',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <Plus size={16} />
            Milestone
          </button>
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      <PropertiesSidebar />
    </div>
  );
}

function StatusBadge({ status }) {
  const statuses = {
    backlog: { icon: <CircleDashed size={14} />, label: 'Backlog', color: '#9898a0' },
    todo: { icon: <Circle size={14} />, label: 'Todo', color: '#9898a0' },
    inProgress: { icon: <CircleDot size={14} />, label: 'In Progress', color: '#f5a623' },
    done: { icon: <CheckCircle2 size={14} />, label: 'Done', color: '#5e6ad2' },
  };
  const s = statuses[status] || statuses.backlog;
  
  return (
    <span className="linear-badge" style={{ gap: '6px' }}>
      <span style={{ color: s.color }}>{s.icon}</span>
      {s.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className="linear-badge">
      <MoreHorizontal size={14} color="#5c5c66" />
      No priority
    </span>
  );
}

function PropertyPill({ icon, label }) {
  return (
    <span className="linear-badge" style={{ color: '#5c5c66' }}>
      {icon}
      {label}
    </span>
  );
}

function TeamBadge({ name }) {
  return (
    <span className="linear-badge">
      <div style={{
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        background: '#5e6ad2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Scale size={8} color="#fff" />
      </div>
      {name}
    </span>
  );
}

function PropertiesSidebar() {
  return (
    <aside style={{
      width: '280px',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      background: '#0f0f10',
      overflow: 'auto'
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#9898a0' }}>Properties</span>
        <Plus size={14} color="#5c5c66" style={{ cursor: 'pointer' }} />
      </div>

      <div style={{ padding: '12px 16px' }}>
        <PropertyRow label="Status" value={<StatusBadge status="backlog" />} />
        <PropertyRow label="Priority" value={<span style={{ color: '#5c5c66' }}>No priority</span>} />
        <PropertyRow label="Lead" value={<span style={{ color: '#5c5c66' }}>Add lead</span>} />
        <PropertyRow label="Members" value={<span style={{ color: '#5c5c66' }}>Add members</span>} />
        <PropertyRow label="Start date" value={<span style={{ color: '#5c5c66' }}>—</span>} />
        <PropertyRow label="Target date" value={<span style={{ color: '#5c5c66' }}>—</span>} />
        <PropertyRow label="Teams" value={<TeamBadge name="Litigation" />} />
        <PropertyRow label="Labels" value={<span style={{ color: '#5c5c66' }}>Add label</span>} />
      </div>

      {/* Milestones Section */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#9898a0' }}>Milestones</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ChevronDown size={12} color="#5c5c66" />
            <Plus size={14} color="#5c5c66" style={{ cursor: 'pointer' }} />
          </div>
        </div>
        <p style={{ fontSize: '13px', color: '#5c5c66', lineHeight: 1.5 }}>
          Add milestones to organize work within your project and break it into more granular stages. <span style={{ color: '#5e6ad2', cursor: 'pointer' }}>Learn more</span>
        </p>
      </div>

      {/* Activity Section */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#9898a0' }}>Activity</span>
          <span style={{ fontSize: '12px', color: '#5e6ad2', cursor: 'pointer' }}>See all</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#5e6ad2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 600,
            color: '#fff'
          }}>
            FQ
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '13px', color: '#ebebef' }}>frank.quesada</span>
            <span style={{ fontSize: '13px', color: '#5c5c66' }}> created the project · </span>
            <span style={{ fontSize: '13px', color: '#5c5c66' }}>Dec 22</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function PropertyRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)'
    }}>
      <span style={{ fontSize: '13px', color: '#5c5c66' }}>{label}</span>
      <div style={{ fontSize: '13px' }}>{value}</div>
    </div>
  );
}

// Issues List View
function IssuesListView() {
  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <h1 style={{ fontSize: '16px', fontWeight: 600 }}>All Issues</h1>
        <span style={{
          padding: '2px 8px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#9898a0'
        }}>6</span>

        <div style={{ flex: 1 }} />

        <button className="linear-btn linear-btn-ghost">
          <Filter size={14} />
          Filter
        </button>
        <button className="linear-btn linear-btn-ghost">
          <Settings size={14} />
          Display
        </button>
        <button className="linear-btn linear-btn-primary">
          <Plus size={14} />
          New Issue
        </button>
      </div>

      {/* Issues List */}
      <div>
        <IssueRow 
          id="SEN-71"
          title="Sentinel Investigation - Review evidence"
          status="inProgress"
          priority="high"
          assignee="FQ"
        />
        <IssueRow 
          id="SEN-52"
          title="Safety PPE v. HOBAO - Document production"
          status="todo"
          priority="medium"
        />
        <IssueRow 
          id="SEN-31"
          title="Compliance Issue - Interview scheduling"
          status="backlog"
          priority="low"
        />
        <IssueRow 
          id="SEN-21"
          title="Safety PPE v. Skanda - Response deadline"
          status="todo"
          priority="urgent"
          assignee="FQ"
        />
        <IssueRow 
          id="SEN-11"
          title="Epstein Files - Document review"
          status="inProgress"
          priority="medium"
          assignee="CC"
        />
        <IssueRow 
          id="SEN-01"
          title="USA WP TEST - Initial assessment"
          status="done"
          priority="low"
        />
      </div>
    </div>
  );
}

function IssueRow({ id, title, status, priority, assignee }) {
  const statusIcons = {
    backlog: <CircleDashed size={16} color="#5c5c66" />,
    todo: <Circle size={16} color="#9898a0" />,
    inProgress: <CircleDot size={16} color="#f5a623" />,
    done: <CheckCircle2 size={16} color="#5e6ad2" />,
  };

  const priorityColors = {
    urgent: '#f87171',
    high: '#fb923c',
    medium: '#fbbf24',
    low: '#9898a0',
  };

  return (
    <div
      className="linear-table-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer'
      }}
    >
      <input type="checkbox" style={{ accentColor: '#5e6ad2' }} />
      
      {/* Priority Indicator */}
      <div style={{
        width: '4px',
        height: '16px',
        borderRadius: '2px',
        background: priorityColors[priority] || priorityColors.low
      }} />
      
      <span style={{ fontSize: '13px', color: '#5c5c66', width: '60px' }}>{id}</span>
      
      {statusIcons[status]}
      
      <span style={{ fontSize: '14px', color: '#ebebef', flex: 1 }}>{title}</span>
      
      {assignee && (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#5e6ad2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 600,
          color: '#fff'
        }}>
          {assignee}
        </div>
      )}
    </div>
  );
}

// Issue Detail View
function IssueDetailView() {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Header */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <span style={{ color: '#9898a0' }}>My issues</span>
            <ChevronRight size={14} color="#5c5c66" />
            <span style={{ color: '#ebebef' }}>SEN-71</span>
          </nav>
          <Star size={16} color="#5c5c66" style={{ cursor: 'pointer' }} />
          <MoreHorizontal size={16} color="#5c5c66" style={{ cursor: 'pointer' }} />

          <div style={{ flex: 1 }} />

          <button className="linear-btn linear-btn-ghost">
            <Link2 size={14} />
          </button>
          <button className="linear-btn linear-btn-ghost">
            <Copy size={14} />
          </button>
          <button className="linear-btn linear-btn-ghost">
            <PanelRight size={14} />
          </button>
        </div>

        {/* Issue Content */}
        <div style={{ padding: '32px 24px', maxWidth: '720px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#ebebef',
            marginBottom: '16px'
          }}>
            Sentinel Investigation - Review evidence
          </h1>

          <div style={{
            padding: '12px',
            color: '#5c5c66',
            fontSize: '14px',
            marginBottom: '24px'
          }}>
            Add description...
          </div>

          {/* Attachments / Sub-issues area */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="linear-btn linear-btn-ghost" style={{ height: '28px', fontSize: '12px' }}>
                <AtSign size={14} />
              </button>
              <button className="linear-btn linear-btn-ghost" style={{ height: '28px', fontSize: '12px' }}>
                <Paperclip size={14} />
              </button>
            </div>
          </div>

          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            color: '#5c5c66',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <Plus size={16} />
            Add sub-issues
          </button>

          {/* Activity Section */}
          <div style={{ marginTop: '48px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#ebebef' }}>Activity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#5c5c66' }}>Unsubscribe</span>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#0ea5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#fff'
                }}>
                  FQ
                </div>
              </div>
            </div>

            {/* Activity Item */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#5e6ad2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600,
                color: '#fff',
                flexShrink: 0
              }}>
                FQ
              </div>
              <div>
                <span style={{ fontSize: '13px', color: '#ebebef' }}>frank.quesada</span>
                <span style={{ fontSize: '13px', color: '#5c5c66' }}> created the issue · just now</span>
              </div>
            </div>

            {/* Comment Input */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <input
                placeholder="Leave a comment..."
                className="linear-input"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '0'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '12px'
              }}>
                <button className="linear-btn linear-btn-ghost" style={{ height: '28px' }}>
                  <Paperclip size={14} />
                </button>
                <button className="linear-btn linear-btn-ghost" style={{ height: '28px' }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <IssuePropertiesSidebar />
    </div>
  );
}

function IssuePropertiesSidebar() {
  return (
    <aside style={{
      width: '280px',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      background: '#0f0f10',
      overflow: 'auto',
      padding: '16px'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <StatusBadge status="backlog" />
      </div>

      <PropertyRowSimple icon={<MoreHorizontal size={14} />} label="Set priority" />
      <PropertyRowSimple icon={<Users size={14} />} label="Assign" />

      <div style={{ marginTop: '24px', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#5c5c66' }}>Labels</span>
      </div>
      <PropertyRowSimple icon={<Hash size={14} />} label="Add label" />

      <div style={{ marginTop: '24px', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#5c5c66' }}>Project</span>
      </div>
      <PropertyRowSimple icon={<Layers size={14} />} label="Add to project" />
    </aside>
  );
}

function PropertyRowSimple({ icon, label }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 0',
      color: '#5c5c66',
      fontSize: '13px',
      cursor: 'pointer'
    }} className="linear-hover">
      {icon}
      {label}
    </div>
  );
}
