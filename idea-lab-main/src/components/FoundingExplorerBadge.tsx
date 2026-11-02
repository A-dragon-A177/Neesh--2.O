import React from 'react';
import { Award, Sparkles } from 'lucide-react';

export interface FoundingExplorerBadgeProps {
  position?: number | string | null;
  commissionFreeUntil?: string | Date | null;
  className?: string;
}

export const FoundingExplorerBadge: React.FC<FoundingExplorerBadgeProps> = ({
  position = 1,
  commissionFreeUntil,
  className = '',
}) => {
  const formattedDate = commissionFreeUntil
    ? new Date(commissionFreeUntil).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '90 days';

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md ${className}`}
      style={{ backgroundColor: '#F59E0B' }}
      title={`Founding Explorer #${position} — 0% platform commission until ${formattedDate}`}
    >
      <Award className="w-4 h-4 text-white flex-shrink-0" />
      <span>
        Founding Explorer #{position} — Commission-free until {formattedDate}
      </span>
      <Sparkles className="w-3.5 h-3.5 text-amber-100 flex-shrink-0" />
    </div>
  );
};

export default FoundingExplorerBadge;

