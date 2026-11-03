/**
 * Every server action returns one of these instead of throwing, so the client can
 * show a precise message (and highlight `field`) without try/catch.
 */
export type ActionFailure = {
  ok: false;
  error: string;
  field?: string;
  details?: Record<string, unknown>;
};

export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function fail(error: string, field?: string, details?: Record<string, unknown>): ActionFailure {
  const result: ActionFailure = { ok: false, error };
  if (field !== undefined) result.field = field;
  if (details !== undefined) result.details = details;
  return result;
}
