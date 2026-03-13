/**
 * Tax Service (in-memory)
 * Tracks quarterly estimated payment status.
 */

import { Models } from '../models.js';

if (!Models.taxQuarterPayments) Models.taxQuarterPayments = new Map();

function getKey(userId, year) {
  return `${userId}:${year}`;
}

function defaultSchedule(year) {
  return [
    { q: 'Q1', due: `Apr 15, ${year}`, paid: false, status: 'Upcoming' },
    { q: 'Q2', due: `Jun 15, ${year}`, paid: false, status: 'Future' },
    { q: 'Q3', due: `Sep 15, ${year}`, paid: false, status: 'Future' },
    { q: 'Q4', due: `Jan 15, ${year + 1}`, paid: false, status: 'Future' },
  ];
}

function computeStatuses(schedule) {
  const firstUnpaid = schedule.find((x) => !x.paid)?.q;
  return schedule.map((x) => {
    if (x.paid) return { ...x, status: 'Paid' };
    if (x.q === firstUnpaid) return { ...x, status: 'Upcoming' };
    return { ...x, status: 'Future' };
  });
}

export const TaxService = {
  getSchedule(userId, year) {
    const key = getKey(userId, year);
    const existing = Models.taxQuarterPayments.get(key);
    const base = Array.isArray(existing) ? existing : defaultSchedule(year);
    const computed = computeStatuses(base);
    Models.taxQuarterPayments.set(key, computed);
    return computed;
  },

  markPaid(userId, year, quarter) {
    const schedule = this.getSchedule(userId, year);
    const next = schedule.map((x) => (x.q === quarter ? { ...x, paid: true } : x));
    const computed = computeStatuses(next);
    Models.taxQuarterPayments.set(getKey(userId, year), computed);
    return computed;
  },
};
