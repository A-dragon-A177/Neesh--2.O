/**
 * NEESH V19 DOMAIN OPEN COMMITMENT GATING SERVICE
 * Reference: NEESH_V19_MASTER_PRD.md (Section N, V18-3)
 * 
 * Rules:
 * 1. Hard block until 5+ active Sprint paying founders in the domain.
 * 2. Active founder condition: sprint_sessions.state = 'ACTIVE' AND ends_at > NOW().
 * 3. Free-period Spotlights do NOT count.
 */

import { supabase } from '../config/supabase';

export interface DomainCommitmentStatus {
  domainId: string;
  name: string;
  slug: string;
  activeFounderCount: number;
  neededFounders: number;
  isOpen: boolean;
  message: string;
}

export class DomainGatingService {
  public static readonly REQUIRED_FOUNDER_COUNT = 5;

  /**
   * Evaluates if a domain is open based on active paying Sprint founders.
   */
  public static async evaluateDomainStatus(domainId: string): Promise<DomainCommitmentStatus> {
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .single();

    if (domainError || !domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }

    const nowIso = new Date().toISOString();

    // Query active Sprint founders for this domain
    const { data: activeSessions, error: sessionError } = await supabase
      .from('sprint_sessions')
      .select('founder_id, spotlights!inner(id, sparks!inner(domain_id))')
      .eq('spotlights.sparks.domain_id', domainId)
      .eq('state', 'ACTIVE')
      .gt('ends_at', nowIso);

    if (sessionError) {
      console.error('[DomainGatingService] Error querying active sessions:', sessionError);
      // Fallback to domain's stored active_sprint_founder_count if nested query fails
      const storedCount = domain.active_sprint_founder_count || 0;
      const isOpen = storedCount >= this.REQUIRED_FOUNDER_COUNT;
      return {
        domainId: domain.id,
        name: domain.name,
        slug: domain.slug,
        activeFounderCount: storedCount,
        neededFounders: this.REQUIRED_FOUNDER_COUNT,
        isOpen,
        message: isOpen
          ? `${domain.name} is open for Explorer signup (${storedCount} active founders).`
          : `${domain.name} is closed: ${storedCount} of ${this.REQUIRED_FOUNDER_COUNT} needed founders active.`,
      };
    }

    // Unique active paying founders
    const uniqueFounderIds = new Set(
      (activeSessions || []).map((row: any) => row.founder_id).filter(Boolean)
    );
    const activeCount = uniqueFounderIds.size;
    const isOpen = activeCount >= this.REQUIRED_FOUNDER_COUNT;

    return {
      domainId: domain.id,
      name: domain.name,
      slug: domain.slug,
      activeFounderCount: activeCount,
      neededFounders: this.REQUIRED_FOUNDER_COUNT,
      isOpen,
      message: isOpen
        ? `${domain.name} is open for Explorer signup (${activeCount} active founders).`
        : `${domain.name} is closed: ${activeCount} of ${this.REQUIRED_FOUNDER_COUNT} needed founders active.`,
    };
  }

  /**
   * Pure evaluator for testing without DB queries.
   */
  public static isDomainOpen(activePayingFounders: number): boolean {
    return activePayingFounders >= this.REQUIRED_FOUNDER_COUNT;
  }

  /**
   * Recomputes and syncs domain metrics across domain_stats and domains tables.
   */
  public static async syncAllDomainMetrics(): Promise<void> {
    const { data: domains, error } = await supabase.from('domains').select('id, name, slug');
    if (error || !domains) {
      console.error('[DomainGatingService] Failed to load domains for sync:', error);
      return;
    }

    for (const d of domains) {
      try {
        const status = await this.evaluateDomainStatus(d.id);

        // Update domains table
        await supabase
          .from('domains')
          .update({
            active_sprint_founder_count: status.activeFounderCount,
            explorer_signup_open: status.isOpen,
          })
          .eq('id', d.id);

        // Update domain_stats table
        await supabase
          .from('domain_stats')
          .upsert({
            domain: d.slug,
            active_sprint_founder_count: status.activeFounderCount,
            is_open: status.isOpen,
            last_updated_at: new Date().toISOString(),
          });

        console.log(`[DomainGatingService] Domain ${d.slug}: ${status.activeFounderCount} founders, open=${status.isOpen}`);
      } catch (err) {
        console.error(`[DomainGatingService] Sync error on domain ${d.slug}:`, err);
      }
    }
  }

  /**
   * Adds an email to the waitlist for a closed domain.
   */
  public static async joinWaitlist(domainSlug: string, email: string): Promise<{ success: boolean; message: string }> {
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }

    const { data: domain } = await supabase
      .from('domains')
      .select('id, name, slug, explorer_signup_open')
      .eq('slug', domainSlug)
      .maybeSingle();

    if (!domain) {
      throw new Error(`Domain '${domainSlug}' not found`);
    }

    if (domain.explorer_signup_open) {
      return {
        success: true,
        message: `${domain.name} is already open for Explorers! You can sign up directly.`,
      };
    }

    const { error: insertError } = await supabase
      .from('domain_explorer_waitlist')
      .insert({
        domain_id: domain.id,
        email: email.trim().toLowerCase(),
      });

    if (insertError && insertError.code !== '23505') { // 23505 = unique constraint violation
      console.error('[DomainGatingService] Waitlist insert error:', insertError);
      throw new Error('Failed to join waitlist');
    }

    return {
      success: true,
      message: `You are on the waitlist for ${domain.name}. We will notify you once 5 paying founders are active!`,
    };
  }
}

