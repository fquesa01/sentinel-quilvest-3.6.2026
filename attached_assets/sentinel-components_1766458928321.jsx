/**
 * SENTINEL UI COMPONENTS
 * 
 * Drop-in React components using the new design system.
 * Import these into your existing app and use them alongside or 
 * as replacements for your current components.
 * 
 * Usage:
 * import { Button, Card, Badge, NavItem, Tabs } from './sentinel-components';
 */

import React from 'react';

// ============================================
// BUTTONS
// ============================================

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  icon,
  onClick,
  disabled,
  className = '',
  ...props 
}) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    opacity: disabled ? 0.5 : 1,
  };

  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '10px 20px', fontSize: '13px' },
    lg: { padding: '12px 24px', fontSize: '14px' },
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
      color: '#0a0a0f',
    },
    secondary: {
      background: 'rgba(52, 211, 153, 0.15)',
      color: '#34d399',
      border: '1px solid rgba(52, 211, 153, 0.3)',
    },
    ghost: {
      background: 'rgba(255, 255, 255, 0.04)',
      color: 'rgba(255, 255, 255, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
    danger: {
      background: 'rgba(248, 113, 113, 0.15)',
      color: '#f87171',
      border: '1px solid rgba(248, 113, 113, 0.3)',
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}


// ============================================
// CARDS
// ============================================

export function Card({ 
  children, 
  hover = true,
  className = '',
  style = {},
  ...props 
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className={className}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(52,211,153,0.2)' 
          : 'none',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, style = {}, ...props }) {
  return (
    <div
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, style = {}, ...props }) {
  return (
    <div
      style={{
        padding: '24px',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}


// ============================================
// BADGES
// ============================================

export function Badge({ 
  children, 
  variant = 'default',
  size = 'md',
  ...props 
}) {
  const variants = {
    default: {
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(255,255,255,0.6)',
      border: '1px solid rgba(255,255,255,0.1)',
    },
    primary: {
      background: 'rgba(52, 211, 153, 0.15)',
      color: '#34d399',
      border: '1px solid rgba(52, 211, 153, 0.3)',
    },
    success: {
      background: 'rgba(74, 222, 128, 0.15)',
      color: '#4ade80',
      border: '1px solid rgba(74, 222, 128, 0.3)',
    },
    warning: {
      background: 'rgba(251, 191, 36, 0.15)',
      color: '#fbbf24',
      border: '1px solid rgba(251, 191, 36, 0.3)',
    },
    error: {
      background: 'rgba(248, 113, 113, 0.15)',
      color: '#f87171',
      border: '1px solid rgba(248, 113, 113, 0.3)',
    },
    info: {
      background: 'rgba(96, 165, 250, 0.15)',
      color: '#60a5fa',
      border: '1px solid rgba(96, 165, 250, 0.3)',
    },
  };

  const sizes = {
    sm: { padding: '2px 6px', fontSize: '10px' },
    md: { padding: '4px 10px', fontSize: '11px' },
    lg: { padding: '6px 14px', fontSize: '12px' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '6px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        ...variants[variant],
        ...sizes[size],
      }}
      {...props}
    >
      {children}
    </span>
  );
}


// ============================================
// NAVIGATION
// ============================================

export function NavItem({ 
  icon, 
  label, 
  active = false, 
  badge,
  collapsed = false,
  onClick,
  ...props 
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const isActive = active || isHovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: collapsed ? '12px' : '10px 12px',
        marginBottom: '2px',
        background: isActive ? 'rgba(52, 211, 153, 0.08)' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: isActive ? '#34d399' : 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        fontFamily: "'DM Sans', sans-serif",
        justifyContent: collapsed ? 'center' : 'flex-start',
        textAlign: 'left',
        position: 'relative',
        transition: 'all 0.3s ease',
      }}
      {...props}
    >
      {/* Active indicator bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '3px',
        height: isActive ? '60%' : '0%',
        background: 'linear-gradient(180deg, #34d399, #10b981)',
        borderRadius: '0 4px 4px 0',
        transition: 'height 0.3s ease',
      }} />
      
      {icon}
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && badge && (
        <span style={{
          padding: '2px 8px',
          background: 'rgba(52, 211, 153, 0.2)',
          borderRadius: '10px',
          fontSize: '11px',
          color: '#34d399',
          fontWeight: 600,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}


// ============================================
// TABS
// ============================================

export function Tabs({ tabs, activeTab, onChange, ...props }) {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
      {...props}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.id || tab}
          active={activeTab === (tab.id || tab)}
          onClick={() => onChange(tab.id || tab)}
        >
          {tab.label || tab}
        </Tab>
      ))}
    </div>
  );
}

export function Tab({ children, active = false, onClick, ...props }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 20px',
        background: 'none',
        border: 'none',
        color: active ? '#34d399' : 'rgba(255,255,255,0.5)',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        cursor: 'pointer',
        position: 'relative',
        transition: 'color 0.2s ease',
      }}
      {...props}
    >
      {children}
      {active && (
        <div style={{
          position: 'absolute',
          bottom: '-1px',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #34d399, #10b981)',
        }} />
      )}
    </button>
  );
}


// ============================================
// INPUTS
// ============================================

export function Input({ 
  icon,
  placeholder,
  value,
  onChange,
  style = {},
  ...props 
}) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '10px',
        padding: '10px 16px',
        border: `1px solid ${isFocused ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.3s ease',
        boxShadow: isFocused 
          ? '0 0 0 2px rgba(52, 211, 153, 0.2), 0 0 20px rgba(52, 211, 153, 0.1)' 
          : 'none',
        ...style,
      }}
    >
      {icon && <span style={{ color: 'rgba(255,255,255,0.4)' }}>{icon}</span>}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          background: 'none',
          border: 'none',
          outline: 'none',
          color: '#e8e6e3',
          fontSize: '13px',
          fontFamily: "'DM Sans', sans-serif",
          width: '100%',
        }}
        {...props}
      />
    </div>
  );
}


// ============================================
// METRIC CARD
// ============================================

export function MetricCard({ icon, label, value, trend, color = '#34d399' }) {
  return (
    <Card hover style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      {/* Top gradient line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
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
        color: color,
      }}>
        {icon}
      </div>
      
      <div style={{ 
        fontSize: '28px', 
        fontWeight: 600, 
        marginBottom: '4px',
        color: '#e8e6e3',
      }}>
        {value}
      </div>
      
      <div style={{ 
        fontSize: '12px', 
        color: 'rgba(255,255,255,0.5)',
      }}>
        {label}
      </div>
      
      {trend && (
        <div style={{ 
          fontSize: '11px', 
          color: color,
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          {trend}
        </div>
      )}
    </Card>
  );
}


// ============================================
// PAGE HEADER
// ============================================

export function PageHeader({ 
  title, 
  subtitle, 
  breadcrumbs,
  actions,
  badges = [],
}) {
  return (
    <div style={{ marginBottom: '32px' }}>
      {breadcrumbs && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '12px',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '16px',
        }}>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>›</span>}
              <span style={{ 
                color: i === breadcrumbs.length - 1 ? '#34d399' : 'inherit',
                cursor: i < breadcrumbs.length - 1 ? 'pointer' : 'default',
              }}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between',
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
            color: '#e8e6e3',
          }}>
            {title}
            {badges.map((badge, i) => (
              <Badge key={i} variant={badge.variant}>{badge.label}</Badge>
            ))}
          </h1>
          {subtitle && (
            <p style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '14px',
            }}>
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================
// EXPORT ALL
// ============================================

export default {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  NavItem,
  Tabs,
  Tab,
  Input,
  MetricCard,
  PageHeader,
};
