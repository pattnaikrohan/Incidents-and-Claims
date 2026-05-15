export const INCIDENT_STATUSES: Record<string, string[]> = {
  cargo: [
    'Open - Formal Claim',
    'Open - Incident Logged',
    'Open - Under Investigation',
    'Open - Corrective Action Pending',
    'Closed - No Further Action'
  ],
  hr: [
    'Open - New',
    'Open - Under Investigation',
    'Open - Disciplinary Action Pending',
    'Closed - No Further Action',
    'Closed - Disciplinary Action Completed'
  ],
  whs: [
    'Open - New',
    'Open - Under Investigation',
    'Open - Corrective Action Pending',
    'Closed - No Further Action',
    'Closed - Workers Comp Active'
  ],
  it: [
    'Open - New',
    'Open - Under Investigation',
    'Open - Corrective Action Pending',
    'Closed - No Further Action',
    'Closed - Referred to Legal'
  ],
  risk: [
    'Open - New',
    'Open - Under Investigation',
    'Open - Corrective Action Pending',
    'Closed - No Further Action',
    'Closed - Referred to Legal'
  ],
  finance: [
    'Open - New',
    'Open - Under Investigation',
    'Open - Recovery in Progress',
    'Closed - Recovered',
    'Closed - Write-Off Approved',
    'Closed - No Further Action'
  ],
  ncr: [
    'Open - New',
    'Open - Under Investigation',
    'Open - Corrective Action Pending',
    'Closed - No Further Action'
  ]
};

export const COR_STATUSES = ['Open', 'Close'];

export const DEFAULT_STATUSES: Record<string, string> = {
  cargo: 'Open - Incident Logged',
  hr: 'Open - New',
  whs: 'Open - New',
  it: 'Open - New',
  risk: 'Open - New',
  finance: 'Open - New',
  ncr: 'Open - New'
};
