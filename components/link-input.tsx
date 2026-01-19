'use client';

import { useState } from 'react';
import { Plus, X, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LinkInputProps = {
  links: string[];
  onChange: (links: string[]) => void;
  maxLinks?: number;
};

/**
 * Validates a URL string
 * Returns the normalized URL if valid, null otherwise
 */
function normalizeUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;

  // Auto-add https:// if no protocol specified
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }

  // Validate using URL constructor
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * LinkInput - Input for adding multiple URLs
 *
 * Allows adding up to maxLinks URLs with validation.
 * Auto-adds https:// if no protocol is specified.
 */
export function LinkInput({ links, onChange, maxLinks = 10 }: LinkInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canAddMore = links.length < maxLinks;

  const handleAdd = () => {
    if (!inputValue.trim()) return;

    const normalizedUrl = normalizeUrl(inputValue);

    if (!normalizedUrl) {
      setError('URL inválida. Verifica el formato.');
      return;
    }

    // Check for duplicates
    if (links.includes(normalizedUrl)) {
      setError('Este link ya fue agregado.');
      return;
    }

    onChange([...links, normalizedUrl]);
    setInputValue('');
    setError(null);
  };

  const handleRemove = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onChange(newLinks);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (error) setError(null);
  };

  // Extract domain for display
  const getDomain = (url: string): string => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-3">
      {/* Input Row */}
      {canAddMore && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="https://ejemplo.com o ejemplo.com"
              className="w-full bg-white/5 rounded-xl border border-white/5 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="shrink-0 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Max Reached Message */}
      {!canAddMore && (
        <p className="text-xs text-muted-foreground">
          Máximo de {maxLinks} links alcanzado
        </p>
      )}

      {/* Links List */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/5"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-primary/80 hover:text-primary truncate transition-colors"
                title={link}
              >
                {getDomain(link)}
              </a>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-destructive transition-all"
                title="Eliminar link"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
