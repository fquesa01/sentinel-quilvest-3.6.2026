import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  List,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Users,
  Filter,
  Folder,
  FolderPlus,
  FolderMinus,
  FileDown,
  Languages,
  Type,
  Shield,
  Eye,
  EyeOff,
  Check,
  MessageSquare,
} from "lucide-react";

interface DocumentToolsSidebarProps {
  // View mode
  viewMode: 'list' | 'document';
  setViewMode: (mode: 'list' | 'document') => void;
  
  // Navigation
  currentIndex: number;
  totalDocs: number;
  navigateDoc: (direction: 'prev' | 'next') => void;
  navigateToIndex?: (index: number) => void;
  
  // Filters
  uniqueEmployees: string[];
  selectedEmployees: string[];
  setSelectedEmployees: (employees: string[]) => void;
  uniqueDepartments: string[];
  selectedDepartments: string[];
  setSelectedDepartments: (departments: string[]) => void;
  documentSets: any[];
  selectedSetId: string | null;
  setSelectedSetId: (id: string | null) => void;
  
  // Actions
  onExport: () => void;
  onAddToSet: () => void;
  onRemoveFromSet: () => void;
  onAssertPrivilege: () => void;
  currentDoc: any;
  
  // Display options
  showTranslation: boolean;
  setShowTranslation: (show: boolean) => void;
  translatedContent: any;
  translateMutation: any;
  fontSize: string;
  setFontSize: (size: string) => void;
  fontSizeLabels: Record<string, string>;
  showMetadata: boolean;
  setShowMetadata: (show: boolean) => void;
  
  // Thread info
  threadCount: number;
  legalHold: boolean;
  originalLanguage?: string;
}

function NavigationSection({
  currentIndex,
  totalDocs,
  navigateDoc,
  navigateToIndex,
}: {
  currentIndex: number;
  totalDocs: number;
  navigateDoc: (direction: 'prev' | 'next') => void;
  navigateToIndex?: (index: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [jumpToValue, setJumpToValue] = useState('');
  const [jumpSubmitted, setJumpSubmitted] = useState(false);

  const handleJumpToSubmit = (fromKeyboard: boolean = false) => {
    if (fromKeyboard) {
      setJumpSubmitted(true);
    }
    const docNumber = parseInt(jumpToValue, 10);
    if (!isNaN(docNumber) && docNumber >= 1 && docNumber <= totalDocs && navigateToIndex) {
      navigateToIndex(docNumber - 1);
    }
    setIsEditing(false);
    setJumpToValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleJumpToSubmit(true);
    } else if (e.key === 'Escape') {
      setJumpSubmitted(true);
      setIsEditing(false);
      setJumpToValue('');
    }
  };

  const handleBlur = () => {
    if (jumpSubmitted) {
      setJumpSubmitted(false);
      return;
    }
    handleJumpToSubmit(false);
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="space-y-2 px-2">
            {isEditing ? (
              <div className="flex items-center gap-1" data-testid="jump-to-doc-input-wrapper">
                <span className="text-sm text-muted-foreground">Go to</span>
                <Input
                  type="number"
                  min={1}
                  max={totalDocs}
                  value={jumpToValue}
                  onChange={(e) => setJumpToValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  placeholder={String(currentIndex + 1)}
                  className="w-16 h-7 text-center text-sm"
                  autoFocus
                  data-testid="input-jump-to-doc"
                />
                <span className="text-sm text-muted-foreground">of {totalDocs}</span>
              </div>
            ) : (
              <div 
                className="flex items-center justify-center gap-1 cursor-pointer hover-elevate rounded px-2 py-1"
                onClick={() => {
                  if (navigateToIndex) {
                    setJumpToValue(String(currentIndex + 1));
                    setIsEditing(true);
                  }
                }}
                title={navigateToIndex ? "Click to jump to a specific document" : undefined}
                data-testid="text-doc-position"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateDoc('prev');
                  }}
                  disabled={currentIndex === 0}
                  data-testid="button-prev-doc-inline"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {currentIndex + 1} of {totalDocs}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateDoc('next');
                  }}
                  disabled={currentIndex === totalDocs - 1}
                  data-testid="button-next-doc-inline"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDoc('prev')}
                disabled={currentIndex === 0}
                className="flex-1"
                data-testid="button-prev-doc"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDoc('next')}
                disabled={currentIndex === totalDocs - 1}
                className="flex-1"
                data-testid="button-next-doc"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Use arrow keys to navigate
            </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />
    </>
  );
}

export function DocumentToolsSidebar({
  viewMode,
  setViewMode,
  navigateToIndex,
  currentIndex,
  totalDocs,
  navigateDoc,
  uniqueEmployees,
  selectedEmployees,
  setSelectedEmployees,
  uniqueDepartments,
  selectedDepartments,
  setSelectedDepartments,
  documentSets,
  selectedSetId,
  setSelectedSetId,
  onExport,
  onAddToSet,
  onRemoveFromSet,
  onAssertPrivilege,
  currentDoc,
  showTranslation,
  setShowTranslation,
  translatedContent,
  translateMutation,
  fontSize,
  setFontSize,
  fontSizeLabels,
  showMetadata,
  setShowMetadata,
  threadCount,
  legalHold,
  originalLanguage,
}: DocumentToolsSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        {/* View Mode */}
        <SidebarGroup>
          <SidebarGroupLabel>View Mode</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex items-center gap-2 px-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex-1"
                data-testid="button-list-view"
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
              <Button
                variant={viewMode === 'document' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('document')}
                className="flex-1"
                data-testid="button-document-view"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Document
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Navigation */}
        {viewMode === 'document' && (
          <NavigationSection
            currentIndex={currentIndex}
            totalDocs={totalDocs}
            navigateDoc={navigateDoc}
            navigateToIndex={navigateToIndex}
          />
        )}

        {/* Filters */}
        <SidebarGroup>
          <SidebarGroupLabel>Filters</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2">
              {/* Employees Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    data-testid="button-filter-employees"
                  >
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Employees
                    </div>
                    {selectedEmployees.length > 0 && (
                      <Badge variant="secondary" data-testid="badge-employee-filter-count">
                        {selectedEmployees.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filter by Employee</h4>
                      {selectedEmployees.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmployees([])}
                          data-testid="button-clear-employee-filter"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {uniqueEmployees.map((employee) => (
                          <div key={employee} className="flex items-center space-x-2">
                            <Checkbox
                              id={`employee-${employee}`}
                              checked={selectedEmployees.includes(employee)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEmployees([...selectedEmployees, employee]);
                                } else {
                                  setSelectedEmployees(selectedEmployees.filter(e => e !== employee));
                                }
                              }}
                              data-testid={`checkbox-employee-${employee}`}
                            />
                            <label
                              htmlFor={`employee-${employee}`}
                              className="text-sm cursor-pointer"
                            >
                              {employee}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Departments Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    data-testid="button-filter-departments"
                  >
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      Departments
                    </div>
                    {selectedDepartments.length > 0 && (
                      <Badge variant="secondary" data-testid="badge-department-filter-count">
                        {selectedDepartments.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filter by Department</h4>
                      {selectedDepartments.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDepartments([])}
                          data-testid="button-clear-department-filter"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {uniqueDepartments.map((department) => (
                          <div key={department} className="flex items-center space-x-2">
                            <Checkbox
                              id={`department-${department}`}
                              checked={selectedDepartments.includes(department)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDepartments([...selectedDepartments, department]);
                                } else {
                                  setSelectedDepartments(selectedDepartments.filter(d => d !== department));
                                }
                              }}
                              data-testid={`checkbox-department-${department}`}
                            />
                            <label
                              htmlFor={`department-${department}`}
                              className="text-sm cursor-pointer"
                            >
                              {department}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Document Sets */}
              <Select value={selectedSetId || "all"} onValueChange={(value) => setSelectedSetId(value === "all" ? null : value)}>
                <SelectTrigger className="w-full" data-testid="select-document-set">
                  <div className="flex items-center">
                    <Folder className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Documents" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  {documentSets.map((set: any) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name} ({set.documentCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={!currentDoc && viewMode === 'document'}
                className="w-full justify-start"
                data-testid="button-export-document"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onAddToSet}
                className="w-full justify-start"
                data-testid="button-add-to-set"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Add to Set
              </Button>

              {selectedSetId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRemoveFromSet}
                  className="w-full justify-start"
                  data-testid="button-remove-from-set"
                >
                  <FolderMinus className="h-4 w-4 mr-2" />
                  Remove from Set
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onAssertPrivilege}
                className="w-full justify-start"
                data-testid="button-assert-privilege"
              >
                <Shield className="h-4 w-4 mr-2" />
                Assert Privilege
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Display Options */}
        <SidebarGroup>
          <SidebarGroupLabel>Display</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2">
              {/* Translation */}
              {originalLanguage && (
                <Badge variant="outline" className="w-full justify-center" data-testid="badge-original-language">
                  <Languages className="h-3 w-3 mr-1" />
                  Original: {originalLanguage}
                </Badge>
              )}
              {showTranslation ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTranslation(false)}
                  className="w-full justify-start"
                  data-testid="button-show-original"
                >
                  <Languages className="h-4 w-4 mr-2" />
                  Show Original
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (translatedContent) {
                      setShowTranslation(true);
                    } else {
                      translateMutation.mutate(currentDoc?.id);
                    }
                  }}
                  disabled={translateMutation.isPending}
                  className="w-full justify-start"
                  data-testid="button-translate"
                >
                  <Languages className="h-4 w-4 mr-2" />
                  {translateMutation.isPending ? "Translating..." : "Translate"}
                </Button>
              )}

              {/* Font Size */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-font-size">
                    <Type className="h-4 w-4 mr-2" />
                    {fontSizeLabels[fontSize]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {Object.entries(fontSizeLabels).map(([size, label]) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => setFontSize(size)}
                      data-testid={`menuitem-font-${size}`}
                    >
                      {fontSize === size && <Check className="h-4 w-4 mr-2" />}
                      {fontSize !== size && <span className="w-4 mr-2" />}
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Show/Hide Metadata */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetadata(!showMetadata)}
                className="w-full justify-start"
                data-testid="button-toggle-metadata"
              >
                {showMetadata ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showMetadata ? "Hide Metadata" : "Show Metadata"}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Status Badges */}
        {(legalHold || threadCount > 1) && (
          <>
            <Separator />
            <SidebarGroup>
              <SidebarGroupLabel>Status</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-2 px-2">
                  {legalHold && (
                    <Badge variant="destructive" className="w-full justify-center" data-testid="badge-legal-hold">
                      Legal Hold
                    </Badge>
                  )}
                  {threadCount > 1 && (
                    <Badge variant="outline" className="w-full justify-center" data-testid="badge-thread-count">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Thread ({threadCount})
                    </Badge>
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
