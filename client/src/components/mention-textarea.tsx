import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MentionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MentionTextareaProps {
  id?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  "data-testid"?: string;
}

export function MentionTextarea({
  id,
  placeholder,
  value,
  onChange,
  rows = 4,
  "data-testid": dataTestId,
}: MentionTextareaProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Search users for mentions
  const { data: users = [] } = useQuery<MentionUser[]>({
    queryKey: ["/api/users/search", mentionSearch],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(mentionSearch)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to search users: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: showMentions && mentionSearch.length > 0,
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Detect @ symbol followed by text
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      // Only show mentions if @ is at start of a word (preceded by space, newline, or start of text)
      const charBeforeAt = lastAtSymbol > 0 ? textBeforeCursor[lastAtSymbol - 1] : " ";
      const isValidMentionStart = charBeforeAt === " " || charBeforeAt === "\n";
      
      if (isValidMentionStart && !textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setShowMentions(true);
        setMentionSearch(textAfterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: MentionUser) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    // Replace @search with @userId
    const beforeMention = textBeforeCursor.substring(0, lastAtSymbol);
    const mention = `@${user.id}`;
    const newValue = `${beforeMention}${mention} ${textAfterCursor}`;

    onChange(newValue);
    setShowMentions(false);
    setMentionSearch("");

    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mention.length + 1;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Display format: Replace @userId with @Username
  const displayValue = value.replace(
    /@([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi,
    (match, userId) => {
      // In a real implementation, you'd look up the username
      // For now, just show a placeholder
      return `@user`;
    }
  );

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={handleTextChange}
        rows={rows}
        data-testid={dataTestId}
      />

      {showMentions && users.length > 0 && (
        <div className="absolute z-50 mt-1 w-64 bg-popover border border-border rounded-md shadow-md">
          <Command>
            <CommandList>
              <CommandGroup heading="Mention user">
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => insertMention(user)}
                    className="cursor-pointer"
                    data-testid={`mention-option-${user.id}`}
                  >
                    <div className="flex flex-col">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
