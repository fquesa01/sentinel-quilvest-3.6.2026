/*
 * EXAMPLE USAGE - How to use stagger animations in your components
 * 
 * This file shows examples - don't copy this file directly,
 * just reference it to see how to apply the classes.
 */

// EXAMPLE 1: Basic React Component
// ================================

import './stagger-animations.css';  // Import at top of your component

function DashboardView() {
  return (
    <div>
      {/* Header animates first */}
      <div className="stagger-1">
        <h1>Good morning, Frank</h1>
        <p>You have 3 priority items</p>
      </div>

      {/* Stats row animates second */}
      <div className="stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <StatCard label="Active Cases" value="12" />
        <StatCard label="Open Deals" value="$8.4M" />
        <StatCard label="Pending Review" value="847" />
        <StatCard label="Urgent Items" value="3" />
      </div>

      {/* Main content animates third */}
      <div className="stagger-3">
        <PriorityTasksCard />
      </div>

      {/* Secondary content animates fourth */}
      <div className="stagger-4">
        <RecentActivityCard />
      </div>
    </div>
  );
}


// EXAMPLE 2: Force re-animation on view change
// ============================================

function App() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div>
      <nav>
        <button onClick={() => setActiveView('dashboard')}>Dashboard</button>
        <button onClick={() => setActiveView('cases')}>Cases</button>
      </nav>

      {/* key={activeView} forces remount, which replays animations */}
      <main key={activeView}>
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'cases' && <CasesView />}
      </main>
    </div>
  );
}


// EXAMPLE 3: Animate individual list items
// ========================================

function CasesList({ cases }) {
  return (
    <div>
      <h2 className="stagger-1">All Cases</h2>
      
      {cases.map((caseItem, index) => (
        <div 
          key={caseItem.id} 
          className={`stagger-${Math.min(index + 2, 6)}`}  // stagger-2 through stagger-6
        >
          <CaseRow case={caseItem} />
        </div>
      ))}
    </div>
  );
}


// EXAMPLE 4: Using with existing className
// ========================================

function Card({ children, className }) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}

// Usage:
<Card className="stagger-1">First card</Card>
<Card className="stagger-2">Second card</Card>
<Card className="stagger-3">Third card</Card>
