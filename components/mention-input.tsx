'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AtSign } from 'lucide-react';
import { getTeamUsers } from '@/app/actions/users';

type User = {
  id: string;
  name: string;
  imageUrl: string | null;
};

type MentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * MentionInput - Textarea with @mention support using focus/blur toggle
 *
 * Simple approach: show formatted view when blurred, raw textarea when focused.
 * After selecting a mention, auto-blur to show the formatted result.
 */
export function MentionInput({ value, onChange, placeholder }: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mentionButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Fetch team users on mount
  useEffect(() => {
    getTeamUsers().then(setUsers);
  }, []);

  // Filter users based on search query
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle text changes and detect @ trigger
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);

    // Find if we're in a mention context (after @ without space)
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowDropdown(true);
        // Reset selected index when search query changes
        if (textAfterAt !== searchQuery) {
          setSelectedIndex(0);
        }
        setSearchQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        return;
      }
    }

    setShowDropdown(false);
    setSearchQuery('');
    setMentionStartIndex(-1);
    setSelectedIndex(0);
  }, [onChange, searchQuery]);

  // Insert selected user as mention
  const selectUser = useCallback((user: User) => {
    if (mentionStartIndex === -1) return;

    const before = value.slice(0, mentionStartIndex);
    const after = value.slice(mentionStartIndex + 1 + searchQuery.length);
    const mention = `@[${user.name}](${user.id})`;

    const newValue = before + mention + ' ' + after;
    onChange(newValue);

    setShowDropdown(false);
    setSearchQuery('');
    setMentionStartIndex(-1);

    // Auto-blur to show formatted view
    setTimeout(() => {
      textareaRef.current?.blur();
    }, 0);
  }, [value, onChange, mentionStartIndex, searchQuery]);

  // Handle manual @ button click - opens dropdown to pick a user
  const handleMentionButtonClick = useCallback(() => {
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Insert @ at cursor position (or end if no cursor)
        const cursorPos = textareaRef.current.selectionStart || value.length;
        const before = value.slice(0, cursorPos);
        const after = value.slice(cursorPos);
        const newValue = before + '@' + after;
        onChange(newValue);

        // Set up for mention selection
        setMentionStartIndex(cursorPos);
        setSearchQuery('');
        setShowDropdown(true);
        setSelectedIndex(0);

        // Move cursor after the @
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = cursorPos + 1;
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    }, 50);
  }, [value, onChange]);

  // Handle keyboard navigation in dropdown
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredUsers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        selectUser(filteredUsers[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  }, [showDropdown, filteredUsers, selectedIndex, selectUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        mentionButtonRef.current &&
        !mentionButtonRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Click on formatted view focuses textarea
  const handleFormattedClick = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      {/* @ button to manually trigger mention dropdown */}
      <div className="flex items-center justify-end mb-2">
        <button
          ref={mentionButtonRef}
          type="button"
          onClick={handleMentionButtonClick}
          className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all"
          title="Mencionar usuario"
        >
          <AtSign className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Container - shows formatted view OR textarea based on focus */}
      <div
        ref={containerRef}
        className={`relative w-full bg-white/5 rounded-2xl border p-4 min-h-[120px] transition-all ${
          isFocused
            ? 'border-primary/20 ring-4 ring-primary/5'
            : 'border-white/5 hover:border-white/10'
        }`}
      >
        {/* Formatted view (shown when NOT focused) */}
        {!isFocused && (
          <div
            onClick={handleFormattedClick}
            className="text-sm leading-relaxed whitespace-pre-wrap break-words cursor-text min-h-[80px]"
          >
            {value ? renderMentions(value) : (
              <span className="text-muted-foreground/50">{placeholder}</span>
            )}
          </div>
        )}

        {/* Textarea (shown when focused) */}
        {isFocused && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setIsFocused(false)}
            autoFocus
            rows={4}
            placeholder={placeholder}
            className="w-full bg-transparent text-foreground text-sm leading-relaxed focus:outline-none resize-none overflow-y-auto placeholder:text-muted-foreground/50"
          />
        )}

        {/* Hidden textarea to capture focus when clicking formatted view */}
        {!isFocused && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            className="absolute opacity-0 pointer-events-none"
            tabIndex={-1}
          />
        )}
      </div>

      {/* User Dropdown */}
      {showDropdown && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl z-50"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                index === selectedIndex
                  ? 'bg-primary/20 text-foreground'
                  : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              <img
                src={user.imageUrl || '/placeholder-avatar.png'}
                alt=""
                className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
              />
              <span className="text-sm font-medium">{user.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state when searching but no matches */}
      {showDropdown && filteredUsers.length === 0 && searchQuery.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 rounded-xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl z-50 p-4"
        >
          <p className="text-sm text-muted-foreground text-center italic">
            No se encontraron usuarios
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Extract user IDs from mention format @[name](userId)
 * Returns array of user IDs found in the text
 */
export function extractMentionIds(text: string): string[] {
  const mentionRegex = /@\[[^\]]+\]\(([^)]+)\)/g;
  const ids: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

/**
 * Render mentions as styled chips instead of raw @[name](id) format
 * Converts @[Juan Pérez](user_123) → <span className="chip">@Juan Pérez</span>
 */
export function renderMentions(text: string): React.ReactNode[] {
  const regex = /@\[([^\]]+)\]\([^)]+\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Mention chip
    parts.push(
      <span
        key={`mention-${keyIndex++}`}
        className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/20 text-primary text-xs font-semibold"
      >
        @{match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  // Remaining text after last mention
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
