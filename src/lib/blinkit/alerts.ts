export interface GrnDeadlineAlert {
  claimId: string;
  poNumber: string;
  deliveryDate: string;
  ticketDeadline: string; // delivery + 10 days
  daysLeft: number;
  urgency: 'normal' | 'warning_day_7' | 'critical_day_9' | 'expired';
  message: string;
}

export interface DnPickupAlert {
  returnReceiptId: string;
  poNumber: string;
  dnNo: string;
  pickupDeadline: string; // 7 days from rejection/receipt
  daysLeft: number;
  urgency: 'normal' | 'warning' | 'critical_liquidation_risk' | 'expired';
  message: string;
}

export interface PoExpiryAlert {
  poId: string;
  poNumber: string;
  validTill: string;
  hoursLeft: number;
  isExpired: boolean;
  message: string;
}

/**
 * Calculates GRN 10-day ticket window status
 * Alert at day 7 and day 9, show "X days left"
 */
export function evaluateGrnTicketDeadline(
  deliveryDateStr: string,
  claimId: string = 'claim-1',
  poNumber: string = 'PO-001'
): GrnDeadlineAlert {
  const delivery = new Date(deliveryDateStr);
  const deadline = new Date(delivery.getTime() + 10 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const diffMs = deadline.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const daysPassed = 10 - daysLeft;

  let urgency: GrnDeadlineAlert['urgency'] = 'normal';
  let message = `${daysLeft} days left to raise ticket in Seller Hub`;

  if (daysLeft <= 0) {
    urgency = 'expired';
    message = `10-day GRN ticket window EXPIRED. Ticket submission may be rejected by Blinkit.`;
  } else if (daysPassed >= 9 || daysLeft <= 1) {
    urgency = 'critical_day_9';
    message = `CRITICAL ALERT (Day 9+): Only ${daysLeft} day(s) left to submit opening footage & POD to Blinkit Seller Hub!`;
  } else if (daysPassed >= 7 || daysLeft <= 3) {
    urgency = 'warning_day_7';
    message = `WARNING (Day 7+): ${daysLeft} days remaining to file shortage claim with opening video.`;
  }

  return {
    claimId,
    poNumber,
    deliveryDate: delivery.toISOString().split('T')[0],
    ticketDeadline: deadline.toISOString().split('T')[0],
    daysLeft,
    urgency,
    message,
  };
}

/**
 * Calculates DN pickup 7-day liquidation deadline
 * Blinkit liquidates un-picked DN stock after 7 days
 */
export function evaluateDnPickupDeadline(
  rejectionDateStr: string,
  returnReceiptId: string = 'ret-1',
  poNumber: string = 'PO-001',
  dnNo: string = 'DN-1001'
): DnPickupAlert {
  const rejectionDate = new Date(rejectionDateStr);
  const deadline = new Date(rejectionDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const diffMs = deadline.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  let urgency: DnPickupAlert['urgency'] = 'normal';
  let message = `${daysLeft} days left to arrange DN pickup from Blinkit warehouse.`;

  if (daysLeft <= 0) {
    urgency = 'expired';
    message = `DEADLINE PASSED: 7 days elapsed. Stock is subject to liquidation by Blinkit!`;
  } else if (daysLeft <= 2) {
    urgency = 'critical_liquidation_risk';
    message = `URGENT RED ALERT: Only ${daysLeft} days before Blinkit liquidates un-picked DN stock (${dnNo})! Book pickup ticket immediately.`;
  } else if (daysLeft <= 4) {
    urgency = 'warning';
    message = `WARNING: ${daysLeft} days left for DN pickup. Raise warehouse appointment ticket now.`;
  }

  return {
    returnReceiptId,
    poNumber,
    dnNo,
    pickupDeadline: deadline.toISOString().split('T')[0],
    daysLeft,
    urgency,
    message,
  };
}

/**
 * Calculates PO Expiry within 24 hours
 */
export function evaluatePoExpiry(
  validTillStr: string,
  poId: string,
  poNumber: string
): PoExpiryAlert {
  const exp = new Date(validTillStr);
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const hoursLeft = Math.round(diffMs / (60 * 60 * 1000));
  const isExpired = diffMs <= 0;

  let message = `${hoursLeft} hours left before R.O. expiry`;
  if (isExpired) {
    message = `R.O. has expired on ${validTillStr}`;
  } else if (hoursLeft <= 24) {
    message = `Expiring soon: Only ${hoursLeft} hours left to reserve and dispatch!`;
  }

  return {
    poId,
    poNumber,
    validTill: validTillStr,
    hoursLeft,
    isExpired,
    message,
  };
}
