/* eslint-disable react-refresh/only-export-components -- a barrel of re-exports; the components it names are each in their own file. */
/**
 * The toast public surface. The manager, the hook and the components live in
 * their own modules; every existing `import { toast } from '.../CustomToast'`
 * keeps working through these re-exports.
 */
export { default } from './toast/Toast';
export { ToastViewport } from './toast/ToastViewport';
export { useToast } from '../hooks/useToast';
export { toast } from '../lib/toastManager';
export type { ToastOptions, ToastType } from '../lib/toastManager';
