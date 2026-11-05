import test from 'node:test'
import assert from 'node:assert/strict'
import { currentPlanningStart, planningDates, shiftPlanningDate, validPlanningDate } from '../frontend/src/features/household/planningDates.ts'

test('chosen Friday gives exactly November 6 through 12', () => {
  assert.deepEqual(planningDates('2026-11-06'), ['2026-11-06','2026-11-07','2026-11-08','2026-11-09','2026-11-10','2026-11-11','2026-11-12'])
  assert.equal(currentPlanningStart('2026-11-06', new Date('2026-11-05T12:00:00')), '2026-11-06')
  assert.equal(currentPlanningStart('2026-11-06', new Date('2026-11-12T12:00:00')), '2026-11-06')
  assert.equal(currentPlanningStart('2026-11-06', new Date('2026-11-13T12:00:00')), '2026-11-13')
})
test('unconfigured calendar keeps Monday, navigation retains chosen weekday', () => {
  assert.equal(currentPlanningStart(null, new Date('2026-11-05T12:00:00')), '2026-11-02')
  assert.equal(shiftPlanningDate('2026-11-06', 7), '2026-11-13')
  assert.equal(shiftPlanningDate('2026-11-06', -7), '2026-10-30')
})
test('calendar boundaries, leap years and daylight saving do not lose days', () => {
  assert.equal(planningDates('2026-12-29')[6], '2027-01-04')
  assert.equal(shiftPlanningDate('2028-02-28', 1), '2028-02-29')
  assert.equal(planningDates('2026-10-23')[6], '2026-10-29')
  assert.equal(currentPlanningStart('2026-10-23', new Date('2026-10-30T12:00:00')), '2026-10-30')
  assert.equal(validPlanningDate('2026-02-31'), false)
  assert.equal(validPlanningDate('invalid'), false)
  assert.equal(validPlanningDate('2028-02-29'), true)
})
