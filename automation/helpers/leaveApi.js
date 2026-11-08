// Leave requests are made and decided with the logged-in user's own session, because the application only
// lets a person apply for their own leave and only lets a supervisor decide on their subordinates' leave.
// So these functions take the page of the person who does the action. They are used for test setup only;
// the screens themselves are exercised by the tests.
const API = 'api/v2/leave/';

async function check(response, what) {
  if (!response.ok()) {
    throw new Error(`${what} failed: ${response.status()} ${await response.text()}`);
  }
  return (await response.json()).data;
}

// `duration` is optional: 'half_day_morning', 'half_day_afternoon' (a full day is the default).
async function applyLeaveAs(page, { leaveTypeId, fromDate, toDate, comment = null, duration }) {
  const body = { leaveTypeId, fromDate, toDate, comment };
  if (duration) body.duration = { type: duration };
  const request = await check(await page.request.post(`${API}leave-requests`, { data: body }), 'Apply for leave');
  return request.id;
}

// `action` is 'APPROVE', 'REJECT' or 'CANCEL'.
async function decideLeaveAs(page, requestId, action) {
  await check(await page.request.put(`${API}employees/leave-requests/${requestId}`, { data: { action } }), `Leave ${action}`);
}

module.exports = { applyLeaveAs, decideLeaveAs };
