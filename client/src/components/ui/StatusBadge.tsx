import React from 'react';
import { ActivityStatus } from '../../types';
import { Badge } from './Badge';
import {
  FileText,
  Clock,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const StatusBadge: React.FC<{ status: ActivityStatus; className?: string }> = ({
  status,
  className,
}) => {
  switch (status) {
    case 'DRAFT':
      return (
        <Badge variant="default" className={className}>
          <FileText className="w-3 h-3 text-slate-500" />
          <span>Draft</span>
        </Badge>
      );
    case 'SUBMITTED':
      return (
        <Badge variant="info" className={className}>
          <Clock className="w-3 h-3 text-sky-600" />
          <span>Submitted</span>
        </Badge>
      );
    case 'UNDER_REVIEW':
      return (
        <Badge variant="purple" className={className}>
          <Eye className="w-3 h-3 text-indigo-600" />
          <span>Under Review</span>
        </Badge>
      );
    case 'CORRECTION_REQUESTED':
      return (
        <Badge variant="warning" className={className}>
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>Correction Needed</span>
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Approved</span>
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Rejected</span>
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
};
