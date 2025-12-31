/**
 * SENTINEL UI COMPONENTS - Navy Blue Theme
 * 
 * Drop-in React components using the navy blue design system.
 * Import these into your existing app and use them alongside or 
 * as replacements for your current components.
 * 
 * Usage:
 * import { Button, Card, Badge, NavItem, Tabs } from './sentinel-navy-components';
 */

import React from 'react';

// Navy Blue Color Palette
const colors = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  primaryLight: '#3b82f6',
  bgTint: '#eff6ff',
  bgMedium: '#dbeafe',
  bgStrong: '#bfdbfe',
  
  // Neutrals
  bgBase: '#f8fafc',
  bgElevated: '#ffffff',
  border: '#e2e8f0',
  borderHover: '#cbd5e1',
  
  // Text
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textDisabled: '#94a3b8',
  
  // Status
  success: '#16a34a',
  successMuted: '#dcfce7',
  successBorder: '#bbf7d0',
  warning: '#b45309',
  warningMuted: '#fef3c7',
  warningBorder: '#fde68a',
  error: '#dc2626',
  errorMuted: '#fef2f2',
  errorBorder: '#fecaca',
};

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
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)',
    },
    secondary: {
      background: colors.bgTint,
      color: colors.primary,
      border: `1px solid ${colors.bgStrong}`,
    },
    ghost: {
      background: colors.bgElevated,
      color: colors.textMuted,
      border: `1px solid ${colors.border}`,
    },
    danger: {
      background: colors.errorMuted,
      color: colors.error,
      border: `1px solid ${colors.errorBorder}`,
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
        background: colors.bgElevated,
        borderRadius: '16px',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(30,64,175,0.1)' 
          : '0 1px 3px rgba(0,0,0,0.04)',
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
        borderBottom: `1px solid ${colors.border}`,
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
    <div style={{ padding: '24px', ...style }} {...props}>
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
      background: '#f1f5f9',
      color: colors.textMuted,
      border: `1px solid ${colors.border}`,
    },
    primary: {
      background: colors.bgTint,
      color: colors.primary,
      border: `1px solid ${colors.bgStrong}`,
    },
    success: {
      background: colors.successMuted,
      color: colors.success,
      border: `1px solid ${colors.successBorder}`,
    },
    warning: {
      background: colors.warningMuted,
      color: colors.warning,
      border: `1px solid ${colors.warningBorder}`,
    },
    error: {
      background: colors.errorMuted,
      color: colors.error,
      border: `1px solid ${colors.errorBorder}`,
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
        background: isActive ? colors.bgTint : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: isActive ? colors.primary : colors.textMuted,
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        fontFamily: "'DM Sans', sans-serif",
        justifyContent: collapsed ? 'center' : 'flex-start',
        textAlign: 'left',
        position: 'relative',
        transition: 'all 0.2s ease',
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
        background: `linear-gradient(180deg, ${colors.primary}, ${colors.primaryDark})`,
        borderRadius: '0 4px 4px 0',
        transition: 'height 0.2s ease',
      }} />
      
      {icon}
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && badge && (
        <span style={{
          padding: '2px 8px',
          background: colors.bgMedium,
          borderRadius: '10px',
          fontSize: '11px',
          color: colors.primary,
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
        borderBottom: `1px solid ${colors.border}`,
        background: colors.bgElevated,
        borderRadius: '12px 12px 0 0',
        padding: '0 8px',
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
        padding: '14px 20px',
        background: 'none',
        border: 'none',
        color: active ? colors.primary : colors.textMuted,
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
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryDark})`,
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
        background: colors.bgElevated,
        borderRadius: '10px',
        padding: '10px 16px',
        border: `1px solid ${isFocused ? colors.primary : colors.border}`,
        transition: 'all 0.2s ease',
        boxShadow: isFocused ? '0 0 0 3px rgba(30, 64, 175, 0.15)' : 'none',
        ...style,
      }}
    >
      {icon && <span style={{ color: colors.textDisabled }}>{icon}</span>}
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
          color: colors.textPrimary,
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

export function MetricCard({ icon, label, value, trend, color = colors.primary }) {
  return (
    <Card hover style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${color}, ${color}80)`,
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
        color: colors.textPrimary,
      }}>
        {value}
      </div>
      
      <div style={{ 
        fontSize: '12px', 
        color: colors.textMuted,
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
          color: colors.textDisabled,
          marginBottom: '16px',
        }}>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>›</span>}
              <span style={{ 
                color: i === breadcrumbs.length - 1 ? colors.primary : 'inherit',
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
            color: colors.textPrimary,
          }}>
            {title}
            {badges.map((badge, i) => (
              <Badge key={i} variant={badge.variant}>{badge.label}</Badge>
            ))}
          </h1>
          {subtitle && (
            <p style={{ 
              color: colors.textMuted, 
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
// EXPORT COLORS FOR CUSTOM USE
// ============================================

export { colors };

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
  colors,
};
