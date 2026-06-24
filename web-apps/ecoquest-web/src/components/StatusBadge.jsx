import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

const STATUS_MAP = {
  ACCEPTED:       { label: 'Accepted',       cls: 'badge-accepted', Icon: CheckCircle2 },
  PENDING_REVIEW: { label: 'Pending Review', cls: 'badge-pending',  Icon: Clock },
  REJECTED:       { label: 'Rejected',       cls: 'badge-rejected', Icon: XCircle },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status, cls: 'badge-neutral', Icon: null };
  const { label, cls, Icon } = config;

  return (
    <span
      className={`badge ${cls}`}
      aria-label={`Status: ${label}`}
    >
      {Icon && <Icon size={11} />}
      {label}
    </span>
  );
}
