import { useMemo } from "react";

type HighlightedTextProps = {
  text: string;
  searchTerms?: string[];
  complianceKeywords?: string[];
  className?: string;
};

// Common compliance keywords from regulations
const DEFAULT_COMPLIANCE_KEYWORDS = [
  // FCPA keywords
  'bribe', 'bribery', 'kickback', 'payment', 'facilitation', 'foreign official',
  'corrupt', 'inducement', 'quid pro quo',
  
  // Antitrust keywords
  'price fixing', 'price-fixing', 'bid rigging', 'market allocation', 'collusion',
  'cartel', 'competitor', 'boycott', 'exclusive dealing',
  
  // SOX keywords
  'revenue recognition', 'financial statements', 'internal controls', 'audit',
  'material misstatement', 'earnings', 'accounting', 'SEC filing',
  
  // Insider trading
  'material non-public', 'MNPI', 'insider', 'trading', 'stock price',
  'confidential', 'acquisition', 'merger',
  
  // General compliance
  'violation', 'illegal', 'sanction', 'prohibited', 'restricted',
  'compliance', 'regulatory', 'unauthorized',
];

export function HighlightedText({
  text,
  searchTerms = [],
  complianceKeywords = [],
  className = "",
}: HighlightedTextProps) {
  const highlightedContent = useMemo(() => {
    if (!text) return null;

    // Combine all keywords and search terms
    const allKeywords = [
      ...searchTerms,
      ...(complianceKeywords.length > 0 ? complianceKeywords : DEFAULT_COMPLIANCE_KEYWORDS),
    ];

    if (allKeywords.length === 0) {
      return <span className={className}>{text}</span>;
    }

    // Create regex pattern for all keywords (case-insensitive word boundaries)
    const pattern = allKeywords
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special chars
      .join('|');
    
    const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
    
    // Split text by matches and create highlighted spans
    const parts: Array<{ text: string; isMatch: boolean; isSearch: boolean }> = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, match.index),
          isMatch: false,
          isSearch: false,
        });
      }
      
      // Add matched text
      const matchedText = match[0];
      const isSearchTerm = searchTerms.some(
        term => matchedText.toLowerCase() === term.toLowerCase()
      );
      
      parts.push({
        text: matchedText,
        isMatch: true,
        isSearch: isSearchTerm,
      });
      
      lastIndex = match.index + matchedText.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        text: text.slice(lastIndex),
        isMatch: false,
        isSearch: false,
      });
    }

    return (
      <span className={className}>
        {parts.map((part, index) => {
          if (!part.isMatch) {
            return <span key={index}>{part.text}</span>;
          }
          
          // Different highlight colors for search terms vs compliance keywords
          const highlightClass = part.isSearch
            ? 'bg-yellow-200 dark:bg-yellow-700/50 text-yellow-900 dark:text-yellow-100 font-medium px-0.5 rounded'
            : 'bg-orange-100 dark:bg-orange-800/40 text-orange-900 dark:text-orange-200 px-0.5 rounded';
          
          return (
            <mark
              key={index}
              className={highlightClass}
              data-testid={`highlight-${part.isSearch ? 'search' : 'compliance'}`}
            >
              {part.text}
            </mark>
          );
        })}
      </span>
    );
  }, [text, searchTerms, complianceKeywords, className]);

  return <>{highlightedContent}</>;
}
