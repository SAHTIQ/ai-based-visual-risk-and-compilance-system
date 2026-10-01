import React, { useRef, useState, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  Database,
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
} from 'lucide-react';

interface AttachedFile {
  name: string;
  size: number;
  type: string;
}

interface ChatComposerProps {
  onSendMessage: (content: string, attachments?: AttachedFile[]) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
  onToggleContext: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  onToggleContext,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 160)}px`;
    }
  }, [inputText]);

  // Global escape key to stop generation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGenerating) {
        e.preventDefault();
        onStopGeneration();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isGenerating, onStopGeneration]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isGenerating) return;

    let finalPrompt = trimmed;
    if (attachments.length > 0) {
      const attachDesc = attachments.map((a) => `[Attached ${a.name} (${(a.size / 1024).toFixed(1)} KB)]`).join('\n');
      finalPrompt = finalPrompt ? `${finalPrompt}\n\n${attachDesc}` : attachDesc;
    }

    onSendMessage(finalPrompt, attachments);
    setInputText('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newAttachments.push({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />;
    }
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
      return <ImageIcon className="w-3.5 h-3.5 text-blue-500" />;
    }
    if (ext === 'pdf') {
      return <FileText className="w-3.5 h-3.5 text-red-500" />;
    }
    return <File className="w-3.5 h-3.5 text-text-secondary" />;
  };

  return (
    <div className="p-3 border-t border-border bg-surface shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border text-xs text-text-primary shadow-2xs"
              >
                {getFileIcon(att.name)}
                <span className="font-medium max-w-[140px] truncate">{att.name}</span>
                <span className="text-[10px] text-text-secondary">
                  ({(att.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  onClick={() => handleRemoveAttachment(idx)}
                  className="p-0.5 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors ml-0.5"
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Card Container */}
        <div className="relative rounded-2xl bg-muted/70 border border-border focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2 shadow-xs">
          {/* Multiline Textarea */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your productivity, habits, behaviour, forecasts, or simulations..."
            rows={1}
            disabled={isGenerating}
            className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-secondary outline-none resize-none px-2 py-1 max-h-40 leading-relaxed"
          />

          {/* Bottom Toolbar: Attachments, Context Toggle, Send/Stop */}
          <div className="flex items-center justify-between pt-1 px-1 mt-1 border-t border-border/40">
            {/* Left Actions */}
            <div className="flex items-center gap-1">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.pdf,.txt,.json,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                title="Attach files (CSV, PDF, TXT, images)"
                aria-label="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Context Panel Button */}
              <button
                type="button"
                onClick={onToggleContext}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                title="Inspect personal data context"
                aria-label="Inspect personal data context"
              >
                <Database className="w-4 h-4" />
              </button>
            </div>

            {/* Right Action: Send or Stop */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-secondary hidden sm:inline">
                Shift + Enter for new line
              </span>

              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-status-danger text-white text-xs font-semibold hover:bg-status-danger/90 transition-colors shadow-xs"
                  title="Stop generating (Esc)"
                  aria-label="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() && attachments.length === 0}
                  className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:opacity-30 disabled:hover:bg-primary transition-all shadow-xs"
                  title="Send message (Enter)"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Guidance */}
        <p className="text-[10px] text-center text-text-secondary">
          Personal data grounded • Insufficient evidence explicitly flagged • Privacy guaranteed
        </p>
      </div>
    </div>
  );
};
