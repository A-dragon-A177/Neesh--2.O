import React from 'react';

export type PioneerGrade = 'SEED' | 'RISING' | 'PRO' | 'MASTER' | 'ELITE';

// Canonical Section AA.2 Grade Color Tokens
export const GRADE_COLORS: Record<PioneerGrade, string> = {
  SEED: '#6B7280', // neutral grey
  RISING: '#3B82F6', // blue
  PRO: '#10B981', // emerald green
  MASTER: '#F59E0B', // amber gold
  ELITE: '#8B5CF6', // purple
};

export const GRADE_COLOR_TOKENS: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  SEED: {
    bg: 'rgba(107, 114, 128, 0.1)',
    text: '#6B7280',
    border: 'rgba(107, 114, 128, 0.3)',
    label: 'Seed Pioneer',
  },
  RISING: {
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#3B82F6',
    border: 'rgba(59, 130, 246, 0.3)',
    label: 'Rising Pioneer',
  },
  PRO: {
    bg: 'rgba(16, 185, 129, 0.1)',
    text: '#10B981',
    border: 'rgba(16, 185, 129, 0.3)',
    label: 'Pro Pioneer',
  },
  MASTER: {
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#F59E0B',
    border: 'rgba(245, 158, 11, 0.3)',
    label: 'Master Pioneer',
  },
  ELITE: {
    bg: 'rgba(139, 92, 246, 0.1)',
    text: '#8B5CF6',
    border: 'rgba(139, 92, 246, 0.3)',
    label: 'Elite Pioneer',
  },
};

export interface PioneerGradeBadgeProps {
  grade: PioneerGrade | string;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  points?: number;
  className?: string;
}

export const PioneerGradeBadge: React.FC<PioneerGradeBadgeProps> = ({
  grade,
  size = 'md',
  showPoints = false,
  points,
  className = '',
}) => {
  const normalizedGrade = (grade || 'SEED').toUpperCase();
  const config = GRADE_COLOR_TOKENS[normalizedGrade] || GRADE_COLOR_TOKENS.SEED;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-sm px-2.5 py-1 font-semibold',
    lg: 'text-base px-3 py-1.5 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${sizeClasses} ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border,
      }}
      title={`${config.label}${points !== undefined ? ` (${points} pts)` : ''}`}
    >
      <span
        className="w-2 h-2 rounded-full inline-block"
        style={{ backgroundColor: config.text }}
      />
      <span>{config.label}</span>
      {showPoints && points !== undefined && (
        <span className="opacity-80 text-xs">({points} pts)</span>
      )}
    </span>
  );
};

export default PioneerGradeBadge;
