import { useId, useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { ATTACHMENT_ACCEPT, formatBytes } from '../../../chat-kit/mediaTypes';
import { addTicketFiles, TICKET_ATTACHMENTS_MAX } from '../../../../lib/tickets';
import { fieldError, focusRing, rowButton } from '../../ui/styles';

/** Props for {@link TicketFilePicker}. */
export interface TicketFilePickerProps {
  /** The files picked so far (uploaded when the message is sent). */
  files: File[];
  /** The new list after a pick or a removal. */
  onChange: (files: File[]) => void;
  /** Problems with the last pick (type, size, too many) and any form error about the files. */
  errors: string[];
  /** Replaces the problems shown. */
  onErrors: (errors: string[]) => void;
  disabled?: boolean;
}

/**
 * The attach button and the picked files of a ticket or a reply: up to five
 * files, checked with the chat kit's type and size rules, each removable with
 * a 44px button. The files upload (`POST /upload/chat-attachment`) only when
 * the message is sent.
 *
 * @param props - See {@link TicketFilePickerProps}.
 * @param props.files - The files picked.
 * @param props.onChange - Receives the new list.
 * @param props.errors - The problems to show.
 * @param props.onErrors - Replaces the problems.
 * @param props.disabled - Locks the picker while sending.
 * @returns The picker.
 */
export function TicketFilePicker({ files, onChange, errors, onErrors, disabled = false }: TicketFilePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const full = files.length >= TICKET_ATTACHMENTS_MAX;

  /**
   * Adds the chosen files and clears the input, so the same file can be picked again.
   *
   * @param list - What the file dialog returned.
   */
  const pick = (list: FileList | null): void => {
    const result = addTicketFiles(files, Array.from(list ?? []));
    onChange(result.files);
    onErrors(result.errors);
    if (input.current) input.current.value = '';
  };

  /**
   * Removes one picked file.
   *
   * @param index - Its position.
   */
  const remove = (index: number): void => {
    onChange(files.filter((_, at) => at !== index));
    onErrors([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`${rowButton} gap-2`} onClick={() => input.current?.click()} disabled={disabled || full} aria-describedby={hintId}>
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          Attach files
        </button>
        <span id={hintId} className="text-[13px] text-tl-muted">
          {files.length} of {TICKET_ATTACHMENTS_MAX} files · photos, PDFs and documents
        </span>
        <input ref={input} type="file" multiple hidden accept={ATTACHMENT_ACCEPT} onChange={(event) => pick(event.target.files)} />
      </div>
      {files.length ? (
        <ul aria-label="Files to send" className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex min-h-[44px] items-center gap-3 rounded-[14px] border border-tl-line-soft pl-3.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tl-ink">{file.name}</span>
              <span className="shrink-0 text-[13px] text-tl-muted">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tl-muted hover:bg-tl-bg hover:text-tl-ink disabled:opacity-45 ${focusRing}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {errors.length ? (
        <ul role="alert" className={fieldError}>
          {errors.map((problem, index) => (
            <li key={`${problem}-${index}`}>{problem}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
