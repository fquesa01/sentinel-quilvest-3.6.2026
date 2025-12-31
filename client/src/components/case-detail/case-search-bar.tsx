import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, X, FileText, Mail, MessageSquare, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CaseAIAssistant } from "./case-ai-assistant";

interface SearchResult {
  id: string;
  type: "document" | "email" | "interview" | "alert" | "task";
  title: string;
  snippet: string;
  date: string;
}

interface CaseSearchBarProps {
  caseId: string;
  onSearch?: (query: string) => void;
  searchResults?: SearchResult[];
  isSearching?: boolean;
}

const getTypeIcon = (type: string) => {
  const icons = {
    document: FileText,
    email: Mail,
    interview: MessageSquare,
    alert: AlertTriangle,
    task: FileText,
  };
  const Icon = icons[type as keyof typeof icons] || FileText;
  return <Icon className="h-4 w-4" />;
};

const getTypeColor = (type: string) => {
  const colors = {
    document: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    email: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    interview: "bg-green-500/10 text-green-700 dark:text-green-400",
    alert: "bg-red-500/10 text-red-700 dark:text-red-400",
    task: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  };
  return colors[type as keyof typeof colors] || colors.document;
};

export function CaseSearchBar({ caseId, onSearch, searchResults = [], isSearching = false }: CaseSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showAvaChat, setShowAvaChat] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      onSearch?.(query);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <>
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search everything in this case (docs, emails, transcripts, notes...)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10"
              data-testid="input-case-search"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 hover-elevate active-elevate-2 rounded-sm"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          
          <Button 
            variant="default" 
            onClick={() => setShowAvaChat(true)}
            data-testid="button-ask-ava"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Ask Emma
          </Button>
          
          <CaseAIAssistant
            caseId={caseId}
            isOpen={showAvaChat}
            onOpenChange={setShowAvaChat}
          />
        </div>

        {showResults && searchResults.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg">
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="p-2">
                  <p className="text-sm font-medium text-muted-foreground px-2 py-2">
                    Found {searchResults.length} results
                  </p>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="w-full text-left p-3 hover-elevate active-elevate-2 rounded-md flex items-start gap-3"
                      data-testid={`search-result-${result.id}`}
                    >
                      <div className={`p-2 rounded-md ${getTypeColor(result.type)}`}>
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{result.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.snippet}</p>
                        <p className="text-xs text-muted-foreground mt-1">{result.date}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {showResults && isSearching && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Searching...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
