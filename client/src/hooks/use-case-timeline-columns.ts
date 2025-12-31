import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CustomTimelineColumn } from "@shared/schema";

/**
 * UI-friendly column type used by ManageColumnsDialog and timeline rendering
 */
export interface UiColumn {
  id: string;
  name: string;
  isVisible: boolean;
  isMandatory: boolean;
  isDefault: boolean;
  displayOrder: number;
  columnKey: string;
  columnType: string;
}

// Mandatory columns that cannot be hidden (essential for timeline context)
const MANDATORY_COLUMN_KEYS = ["date", "type", "title"];

/**
 * Maps backend column to UI-friendly format
 */
export function toUiColumn(col: CustomTimelineColumn): UiColumn {
  return {
    id: col.id,
    name: col.columnLabel,
    isVisible: col.isVisible,
    isMandatory: MANDATORY_COLUMN_KEYS.includes(col.columnKey),
    isDefault: col.columnType === "default",
    displayOrder: col.displayOrder,
    columnKey: col.columnKey,
    columnType: col.columnType,
  };
}

/**
 * Shared hook for fetching and managing case timeline columns.
 * Used by both ManageColumnsDialog and TimelineSection to ensure
 * they operate on the same cached data.
 * 
 * Auto-seeds default columns on first fetch per case.
 */
export function useCaseTimelineColumns(caseId: string) {
  const query = useQuery<CustomTimelineColumn[]>({
    queryKey: [`/api/cases/${caseId}/timeline/columns`],
    enabled: !!caseId,
  });

  const columns = query.data || [];
  
  // Map to UI-friendly columns
  const uiColumns = useMemo(() => columns.map(toUiColumn), [columns]);
  
  // Helper selectors
  const visibleColumns = useMemo(
    () => columns
      .filter(col => col.isVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder),
    [columns]
  );
  
  const visibleUiColumns = useMemo(
    () => uiColumns.filter(col => col.isVisible).sort((a, b) => a.displayOrder - b.displayOrder),
    [uiColumns]
  );
  
  const allColumnsSorted = useMemo(
    () => [...columns].sort((a, b) => a.displayOrder - b.displayOrder),
    [columns]
  );
  
  const getColumnByKey = (key: string) => columns.find(col => col.columnKey === key);
  
  const defaultColumns = useMemo(() => columns.filter(col => col.columnType === "default"), [columns]);
  const customColumns = useMemo(() => columns.filter(col => col.columnType === "custom"), [columns]);

  return {
    ...query,
    columns,
    uiColumns,
    visibleColumns,
    visibleUiColumns,
    allColumnsSorted,
    getColumnByKey,
    defaultColumns,
    customColumns,
  };
}
