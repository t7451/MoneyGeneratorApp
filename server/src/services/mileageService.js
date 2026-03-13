/**
 * Mileage Service (in-memory)
 * Minimal backend support for mileage tracking and exports.
 */

import { Models } from '../models.js';

if (!Models.mileageState) Models.mileageState = new Map();
if (!Models.mileageTrips) Models.mileageTrips = new Map();

const IRS_RATE = 0.67;
const MILES_PER_SECOND = 0.01; // mirrors previous client simulation

function nowIso() {
  return new Date().toISOString();
}

function getUserTrips(userId) {
  const list = Models.mileageTrips.get(userId);
  if (Array.isArray(list)) return list;
  const empty = [];
  Models.mileageTrips.set(userId, empty);
  return empty;
}

function getState(userId) {
  return Models.mileageState.get(userId) || { active: false, startedAt: null, startLocation: null };
}

function computeDistanceMiles(startedAtIso) {
  if (!startedAtIso) return 0;
  const startedAt = new Date(startedAtIso).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const distanceMiles = Number((elapsedSeconds * MILES_PER_SECOND).toFixed(2));
  return { elapsedSeconds, distanceMiles };
}

export const MileageService = {
  getCurrent(userId) {
    const state = getState(userId);
    if (!state.active || !state.startedAt) {
      return { active: false };
    }
    const { elapsedSeconds, distanceMiles } = computeDistanceMiles(state.startedAt);
    return {
      active: true,
      startedAt: state.startedAt,
      startLocation: state.startLocation || 'Current Location',
      elapsedSeconds,
      distanceMiles,
      estimatedDeduction: Number((distanceMiles * IRS_RATE).toFixed(2)),
      irsRate: IRS_RATE,
    };
  },

  start(userId, { startLocation } = {}) {
    const current = getState(userId);
    if (current.active) return this.getCurrent(userId);

    const next = {
      active: true,
      startedAt: nowIso(),
      startLocation: startLocation || 'Current Location',
    };
    Models.mileageState.set(userId, next);
    return this.getCurrent(userId);
  },

  stop(userId, { endLocation, type = 'business' } = {}) {
    const current = getState(userId);
    if (!current.active || !current.startedAt) {
      return { error: 'not_tracking' };
    }

    const { elapsedSeconds, distanceMiles } = computeDistanceMiles(current.startedAt);
    const duration = formatDuration(elapsedSeconds);
    const deduction = type === 'business' ? Number((distanceMiles * IRS_RATE).toFixed(2)) : 0;

    const trip = {
      id: `trip_${Date.now()}`,
      date: nowIso(),
      distance: distanceMiles,
      duration,
      startLocation: current.startLocation || 'Current Location',
      endLocation: endLocation || 'Destination',
      type,
      deduction,
      irsRate: IRS_RATE,
    };

    const trips = getUserTrips(userId);
    trips.unshift(trip);

    Models.mileageState.set(userId, { active: false, startedAt: null, startLocation: null });

    return { trip, trips };
  },

  listTrips(userId, limit = 50) {
    const trips = getUserTrips(userId);
    return trips.slice(0, Math.max(1, Math.min(200, Number(limit) || 50)));
  },

  updateTripType(userId, tripId, type) {
    const trips = getUserTrips(userId);
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return null;
    trip.type = type;
    trip.deduction = type === 'business' ? Number((trip.distance * IRS_RATE).toFixed(2)) : 0;
    return trip;
  },

  exportCsv(userId) {
    const trips = getUserTrips(userId);
    const header = 'date,distance_miles,duration,start_location,end_location,type,deduction_usd';
    const rows = trips.map((t) => [
      String(t.date).slice(0, 10),
      t.distance,
      t.duration,
      csvEscape(t.startLocation),
      csvEscape(t.endLocation),
      t.type,
      t.deduction,
    ].join(','));
    return [header, ...rows].join('\n');
  },
};

function formatDuration(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
