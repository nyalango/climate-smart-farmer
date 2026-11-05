// src/services/http.js
// One place for every network call: timeout, JSON parsing, and errors a farmer can act on.
import { BASE_URL } from '../config/api';

export class ApiError extends Error {
  constructor(message, { status = 0, network = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.network = network;
  }
}

function networkMessage(timedOut) {
  return (
    (timedOut ? `The server at ${BASE_URL} took too long to answer. ` : `Cannot reach the server at ${BASE_URL}. `) +
    'Check your internet connection and try again. If the problem continues, the online service may be temporarily unavailable.'
  );
}

// FastAPI sends {detail: "text"} for our errors and {detail: [{msg, loc}, ...]} for validation errors.
function readableDetail(data) {
  const d = data?.detail;
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return d
      .map(e => {
        const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : '';
        const msg = String(e.msg || 'Invalid value').replace(/^Value error, /, '');
        return field && field !== 'body' ? `${field}: ${msg}` : msg;
      })
      .join('\n');
  }
  return null;
}

export async function fetchJson(url, { method = 'GET', body, timeout = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let res;
  let text;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    text = await res.text();
  } catch (e) {
    throw new ApiError(networkMessage(e?.name === 'AbortError'), { network: true });
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* body was not JSON */ }

  if (!res.ok) {
    throw new ApiError(readableDetail(data) || `Server error (${res.status}). Please try again.`, { status: res.status });
  }
  return data;
}
