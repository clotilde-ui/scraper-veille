'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

type DialogVariant = 'danger' | 'warning' | 'info';
type DialogType = 'confirm' | 'prompt';

interface DialogOptions {
  variant?: DialogVariant;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  message: string;
  defaultValue: string;
  variant: DialogVariant;
  title: string;
  confirmText: string;
  cancelText: string;
}

interface ConfirmDialogContextType {
  dialogState: DialogState;
  confirm: (message: string, options?: DialogOptions) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, options?: DialogOptions) => Promise<string | null>;
  handleConfirm: (value?: string) => void;
  handleCancel: () => void;
}

const defaultState: DialogState = {
  isOpen: false,
  type: 'confirm',
  message: '',
  defaultValue: '',
  variant: 'info',
  title: '',
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
};

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState>(defaultState);
  const resolveRef = useRef<((value: boolean | string | null) => void) | null>(null);

  const confirm = useCallback((message: string, options?: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve as (value: boolean | string | null) => void;
      setDialogState({
        isOpen: true,
        type: 'confirm',
        message,
        defaultValue: '',
        variant: options?.variant || 'info',
        title: options?.title || 'Confirmation',
        confirmText: options?.confirmText || 'Confirmer',
        cancelText: options?.cancelText || 'Annuler',
      });
    });
  }, []);

  const prompt = useCallback((message: string, defaultValue = '', options?: DialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve as (value: boolean | string | null) => void;
      setDialogState({
        isOpen: true,
        type: 'prompt',
        message,
        defaultValue,
        variant: options?.variant || 'info',
        title: options?.title || 'Saisie',
        confirmText: options?.confirmText || 'Valider',
        cancelText: options?.cancelText || 'Annuler',
      });
    });
  }, []);

  const handleConfirm = useCallback((value?: string) => {
    if (resolveRef.current) {
      if (dialogState.type === 'prompt') {
        resolveRef.current(value ?? dialogState.defaultValue);
      } else {
        resolveRef.current(true);
      }
      resolveRef.current = null;
    }
    setDialogState(defaultState);
  }, [dialogState.type, dialogState.defaultValue]);

  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(dialogState.type === 'prompt' ? null : false);
      resolveRef.current = null;
    }
    setDialogState(defaultState);
  }, [dialogState.type]);

  return (
    <ConfirmDialogContext.Provider value={{ dialogState, confirm, prompt, handleConfirm, handleCancel }}>
      {children}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider');
  return ctx;
}
