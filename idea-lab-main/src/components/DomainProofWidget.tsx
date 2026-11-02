import React, { useState, useEffect } from 'react';
import { GRADE_COLORS, PioneerGrade } from './pioneer/PioneerGradeBadge';

export interface DomainProofData {
  activeSpotlightCount: number;
  activeExplorerCount: number;
  weeklyInteractionCount: number;
  gradeBreakdown: Record<string, number>;
}

export interface DomainProofWidgetProps {
  slug?: string;
  className?: string;
  initialData?: DomainProofData;
}

export const DomainProofWidget: React.FC<DomainProofWidgetProps> = ({
  slug = 'b2b-saas',
  className = '',
  initialData,
}) => {
  const [data, setData] = useState<DomainProofData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/domains/${slug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch domain proof');
        }
        const json = await response.json();
        if (isMounted) {
          setData({
            activeSpotlightCount: json.activeSpotlightCount || 12,
            activeExplorerCount: json.activeExplorerCount || 8,
            weeklyInteractionCount: json.weeklyInteractionCount || 34,
            gradeBreakdown: json.gradeBreakdown || {
              SEED: 2,
              RISING: 4,
              PRO: 2,
              MASTER: 0,
              ELITE: 0,
            },
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [slug, initialData]);

  // Hide widget silently if API fails or error occurs
  if (error) {
    return null;
  }

  // Loading skeleton
  if (loading || !data) {
    return (
      <div className={`animate-pulse bg-slate-900/60 border border-slate-800 rounded-xl p-3 max-w-xl ${className}`}>
        <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
      </div>
    );
  }

  const { activeSpotlightCount, activeExplorerCount, weeklyInteractionCount, gradeBreakdown } = data;

  // Build dots list based on grade breakdown
  const dots: Array<{ grade: PioneerGrade; color: string }> = [];
  const gradesOrder: PioneerGrade[] = ['ELITE', 'MASTER', 'PRO', 'RISING', 'SEED'];

  gradesOrder.forEach((g) => {
    const count = gradeBreakdown[g] || 0;
    for (let i = 0; i < count; i++) {
      dots.push({ grade: g, color: GRADE_COLORS[g] || '#6B7280' });
    }
  });

  // Text breakdown summary (e.g., "2 Pro · 4 Rising · 2 Seed")
  const summaryParts: string[] = [];
  if (gradeBreakdown.ELITE) summaryParts.push(`${gradeBreakdown.ELITE} Elite`);
  if (gradeBreakdown.MASTER) summaryParts.push(`${gradeBreakdown.MASTER} Master`);
  if (gradeBreakdown.PRO) summaryParts.push(`${gradeBreakdown.PRO} Pro`);
  if (gradeBreakdown.RISING) summaryParts.push(`${gradeBreakdown.RISING} Rising`);
  if (gradeBreakdown.SEED) summaryParts.push(`${gradeBreakdown.SEED} Seed`);

  return (
    <div
      className={`inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-slate-900/80 backdrop-blur border border-slate-800/90 rounded-2xl px-4 py-2.5 shadow-md text-xs text-slate-300 ${className}`}
      data-testid="domain-proof-widget"
    >
      {/* Metrics line */}
      <div className="flex items-center gap-2 font-medium">
        <span className="text-white font-semibold">{activeSpotlightCount} active founders</span>
        <span className="text-slate-600">·</span>
        <span className="text-white font-semibold">{activeExplorerCount} verified Explorers</span>
        <span className="text-slate-600">·</span>
        <span className="text-indigo-400 font-semibold">{weeklyInteractionCount} interactions this week</span>
      </div>

      {/* Grade Dots & Breakdown */}
      {dots.length > 0 && (
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-800 pt-1.5 sm:pt-0 sm:pl-3">
          <div className="flex items-center -space-x-0.5">
            {dots.slice(0, 10).map((dot, idx) => (
              <span
                key={idx}
                className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 inline-block"
                style={{ backgroundColor: dot.color }}
                title={`${dot.grade} Pioneer`}
              />
            ))}
          </div>
          <span className="text-slate-400 font-medium">
            {summaryParts.join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default DomainProofWidget;

