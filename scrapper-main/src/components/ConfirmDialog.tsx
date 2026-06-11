'use client';

import { useState, useEffect, useRef } from 'react';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-danger-light',
    iconColor: 'text-danger',
    confirmClass: 'bg-danger text-white hover:bg-danger/90',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning-light',
    iconColor: 'text-warning',
    confirmClass: 'bg-warning text-white hover:bg-warning/90',
  },
  info: {
    icon: Info,
    iconBg: 'bg-info-light',
    iconColor: 'text-info',
    confirmClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
};

export function ConfirmDialogContainer() {
  const { dialogState, handleConfirm, handleCancel } = useConfirm();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dialogState.isOpen) {
      setInputValue(dialogState.defaultValue);
      if (dialogState.type === 'prompt') {
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
    }
  }, [dialogState.isOpen, dialogState.defaultValue, dialogState.type]);

  const config = variantConfig[dialogState.variant];
  const Icon = config.icon;

  const onAction = (e: React.MouseEvent) => {
    e.preventDefault();
    if (dialogState.type === 'prompt') {
      if (!inputValue.trim()) return;
      handleConfirm(inputValue.trim());
    } else {
      handleConfirm();
    }
  };

  return (
    <AlertDialog open={dialogState.isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <AlertDialogContent
        className={cn(
          'rounded-[28px] sm:rounded-[28px] bg-surface border-none shadow-lg max-w-md',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        )}
      >
        <AlertDialogHeader className="flex-row items-start gap-4 text-left">
          <div className={cn('p-3 rounded-full flex-shrink-0', config.iconBg)}>
            <Icon className={cn('w-5 h-5', config.iconColor)} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <AlertDialogTitle className="text-lg font-semibold text-text-primary">
              {dialogState.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-text-secondary">
              {dialogState.message}
            </AlertDialogDescription>
            {dialogState.type === 'prompt' && (
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (inputValue.trim()) handleConfirm(inputValue.trim());
                  }
                }}
                className="input-premium mt-1 w-full"
                placeholder="Saisissez une valeur..."
              />
            )}
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <AlertDialogCancel
            className="px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary-light rounded-full border-none bg-transparent mt-0"
          >
            {dialogState.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onAction}
            className={cn('px-6 py-2.5 text-sm font-medium rounded-full', config.confirmClass)}
          >
            {dialogState.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
