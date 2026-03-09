import React from 'react';
import type { OrderStatus, InstallmentStatus } from '../../types';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-stone-100 text-stone-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  const variants: Record<OrderStatus, BadgeProps['variant']> = {
    draft: 'neutral',
    approved: 'info',
    deposit_paid: 'warning',
    in_production: 'warning',
    ready: 'success',
    installed: 'success',
    finished: 'success',
  };
  return <Badge variant={variants[status]}>{label}</Badge>;
}

export function InstallmentStatusBadge({ status, label }: { status: InstallmentStatus; label: string }) {
  const variants: Record<InstallmentStatus, BadgeProps['variant']> = {
    unpaid: 'neutral',
    partial: 'warning',
    paid: 'success',
    overdue: 'error',
  };
  return <Badge variant={variants[status]}>{label}</Badge>;
}
