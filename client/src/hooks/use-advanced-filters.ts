import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

export interface AdvancedFilters {
  // Date filters
  dateSentFrom?: string;
  dateSentTo?: string;
  dateReceivedFrom?: string;
  dateReceivedTo?: string;
  dateCreatedFrom?: string;
  dateCreatedTo?: string;
  dateModifiedFrom?: string;
  dateModifiedTo?: string;
  dateQuickPick?: 'today' | 'last7days' | 'last30days' | 'thisQuarter' | 'custom';

  // People filters
  from?: string[];
  to?: string[];
  cc?: string[];
  bcc?: string[];
  participants?: string[];
  excludePeople?: string[];
  domain?: string[];
  author?: string[];
  custodian?: string[];

  // Content scope
  contentScope?: 'full' | 'subject' | 'attachments' | 'filename';

  // Communication type
  communicationType?: ('email' | 'chat' | 'document' | 'pdf' | 'audio' | 'image')[];

  // Attachment filters
  hasAttachments?: boolean;
  attachmentTypes?: string[];
  attachmentSizeMin?: number;
  attachmentSizeMax?: number;

  // Classification filters
  tags?: string[];
  privilege?: ('none' | 'attorney_client_privileged' | 'work_product' | 'both')[];
  riskScoreMin?: number;
  riskScoreMax?: number;
  sentimentScore?: string;

  // Review workflow filters
  reviewStatus?: ('unreviewed' | 'in_progress' | 'reviewed')[];
  assignedReviewer?: string[];
  batchSet?: string[];

  // Boolean query
  query?: string;
  queryMode?: 'natural' | 'boolean';
}

const STORAGE_KEY = 'sentinel_advanced_filters';

export function useAdvancedFilters() {
  const [, setLocation] = useLocation();
  // Safely initialize from localStorage (client-side only)
  const [filters, setFilters] = useState<AdvancedFilters>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try{
          return JSON.parse(stored);
        } catch {
          return {};
        }
      }
    }
    return {};
  });

  // Sync filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    }
  }, [filters]);

  // Update a single filter
  const updateFilter = useCallback(<K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear a single filter
  const clearFilter = useCallback((key: keyof AdvancedFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get active filter count
  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof AdvancedFilters];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return true;
    return value !== undefined && value !== null && value !== '';
  }).length;

  // Convert filters to URL query params
  const toQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        }
      } else if (typeof value === 'boolean') {
        params.set(key, value.toString());
      } else {
        params.set(key, String(value));
      }
    });
    
    return params.toString();
  }, [filters]);

  // Load filters from URL query params
  const fromQueryParams = useCallback((search: string) => {
    const params = new URLSearchParams(search);
    const newFilters: AdvancedFilters = {};
    
    params.forEach((value, key) => {
      if (key.includes('[]') || ['from', 'to', 'cc', 'bcc', 'participants', 'excludePeople', 'domain', 'author', 'custodian', 'communicationType', 'attachmentTypes', 'tags', 'privilege', 'reviewStatus', 'assignedReviewer', 'batchSet'].includes(key)) {
        newFilters[key as keyof AdvancedFilters] = value.split(',') as any;
      } else if (key === 'hasAttachments') {
        newFilters[key] = value === 'true';
      } else if (['riskScoreMin', 'riskScoreMax', 'attachmentSizeMin', 'attachmentSizeMax'].includes(key)) {
        newFilters[key as keyof AdvancedFilters] = Number(value) as any;
      } else {
        newFilters[key as keyof AdvancedFilters] = value as any;
      }
    });
    
    setFilters(newFilters);
  }, []);

  return {
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    activeFilterCount,
    toQueryParams,
    fromQueryParams,
  };
}
