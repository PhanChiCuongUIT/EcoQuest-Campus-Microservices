import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon, title, description, action }) {
  const Icon = icon || Inbox;
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={48} />
      </div>
      <div className="empty-state-title">{title}</div>
      {description && <p className="empty-state-desc">{description}</p>}
      {action}
    </div>
  );
}
