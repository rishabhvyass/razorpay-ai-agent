import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme';
import { OrderStatus as StatusType } from '../../types';
import { Badge } from '../common/Badge';

export interface OrderStatusProps {
  status: StatusType;
}

export function OrderStatusBadge({ status }: OrderStatusProps) {
  const getReadableLabel = (s: StatusType) => {
    switch (s) {
      case 'PENDING_CONFIRMATION':
        return 'Pending Confirmation';
      case 'ORDER_CREATED':
        return 'Order Created';
      case 'PAYMENT_PENDING':
        return 'Payment Pending';
      case 'PAID':
        return 'Paid & Verified';
      case 'PAYMENT_FAILED':
        return 'Payment Failed';
      case 'PAYMENT_EXPIRED':
        return 'Expired';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return s;
    }
  };

  return <Badge label={getReadableLabel(status)} status={status} size="md" />;
}
