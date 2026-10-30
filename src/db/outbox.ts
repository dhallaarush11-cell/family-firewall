import { db } from './index';
import { supabase, getCurrentMembership } from './supabase';

let isProcessing = false;

/**
 * Queue an outbox record locally in Dexie IndexedDB,
 * and immediately attempt to flush if online.
 */
export async function queueOutboxEvent(
  type: string,
  payload: Record<string, unknown>
): Promise<number> {
  const id = await db.outbox.add({
    type,
    payload,
    status: 'pending',
    createdAt: Date.now()
  });

  // Attempt immediate processing in background
  processOutbox().catch(err => {
    console.warn('Outbox immediate process notice:', err);
  });

  return id as number;
}

/**
 * Process all pending outbox records and push to Supabase.
 * Marks records as 'sent' on success.
 */
export async function processOutbox(): Promise<void> {
  if (isProcessing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  isProcessing = true;

  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      // User hasn't joined a family yet; outbox items remain pending locally
      isProcessing = false;
      return;
    }

    const pendingItems = await db.outbox
      .where('status')
      .equals('pending')
      .sortBy('createdAt');

    for (const item of pendingItems) {
      if (!item.id) continue;

      try {
        if (item.type === 'pause_pressed') {
          // Payload: {"source": "home" | "drill"}
          const source = (item.payload.source as string) || 'home';
          const { error } = await supabase.from('events').insert({
            family_id: membership.family_id,
            member_id: membership.id,
            type: 'pause_pressed',
            payload: { source }
          });

          if (!error) {
            await db.outbox.update(item.id, { status: 'sent' });
          } else {
            console.warn('Outbox event send error:', error.message);
            break;
          }
        } else if (item.type === 'drill_completed') {
          const payload = item.payload;
          const { error: sessionErr } = await supabase.from('drill_sessions').insert({
            family_id: membership.family_id,
            member_id: membership.id,
            scenario_id: (payload.scenarioId as string) || 'digital_arrest',
            scenario_version: (payload.version as number) || 1,
            outcome: (payload.outcome as string) || 'safe',
            hung_up: Boolean(payload.hungUp),
            refused_money: Boolean(payload.refusedMoney),
            refused_otp: Boolean(payload.refusedOtp),
            told_someone: Boolean(payload.toldSomeone),
            pause_used: Boolean(payload.pauseUsed),
            pressure_flags: Array.isArray(payload.flags) ? (payload.flags as string[]) : [],
            duration_sec: typeof payload.duration === 'number' ? payload.duration : 0
          });

          if (!sessionErr) {
            const { error: eventErr } = await supabase.from('events').insert({
              family_id: membership.family_id,
              member_id: membership.id,
              type: 'drill_completed',
              payload: {
                scenario: payload.scenarioId || 'digital_arrest',
                outcome: payload.outcome || 'safe'
              }
            });

            if (!eventErr) {
              await db.outbox.update(item.id, { status: 'sent' });
            } else {
              console.warn('Outbox drill_completed event error:', eventErr.message);
              break;
            }
          } else {
            console.warn('Outbox drill_sessions insert error:', sessionErr.message);
            break;
          }
        }
      } catch (e) {
        console.warn('Outbox item dispatch error (will retry):', e);
        break; // Retry later
      }
    }
  } catch (err) {
    console.warn('Failed to process outbox:', err);
  } finally {
    isProcessing = false;
  }
}

/**
 * Initializes automatic outbox retry on app start and when connection returns.
 */
export function initOutboxWorker(): () => void {
  // Process immediately on start
  processOutbox().catch(() => {});

  const handleOnline = () => {
    processOutbox().catch(() => {});
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    // Periodic check every 30 seconds
    const interval = setInterval(() => {
      processOutbox().catch(() => {});
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }

  return () => {};
}
