'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
 * MentionInput - Textarea with @mention support
 *
 * Detects "@" character and shows a dropdown to select team members.
 * Inserts mentions in format: @[name](userId)
 */
export function MentionInput({ value, onChange, placeholder }: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  // Insert selected user as mention (declared before handleKeyDown to avoid hoisting issues)
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

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + mention.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, onChange, mentionStartIndex, searchQuery]);

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
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-white/5 rounded-2xl border border-white/5 p-4 text-sm leading-relaxed focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all resize-none"
      />

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
