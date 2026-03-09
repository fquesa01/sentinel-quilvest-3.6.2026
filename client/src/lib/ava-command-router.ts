import { addDays, setHours, setMinutes, isValid, getDay } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

// Helper to extract time from string
function extractTime(str: string): { hours: number; minutes: number } | null {
  const timeMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const isPM = timeMatch[3]?.toLowerCase() === "pm";
    const isAM = timeMatch[3]?.toLowerCase() === "am";
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    // Handle ambiguous times (no am/pm) - assume PM for times 1-6, AM for 7-12
    if (!timeMatch[3] && hours >= 1 && hours <= 6) hours += 12;
    return { hours, minutes };
  }
  return null;
}

// Get next occurrence of a day of week (0=Sunday, 1=Monday, etc.)
function getNextDayOfWeek(dayOfWeek: number, includeToday = false): Date {
  const now = new Date();
  const currentDay = getDay(now);
  let daysToAdd = dayOfWeek - currentDay;
  if (daysToAdd < 0 || (daysToAdd === 0 && !includeToday)) {
    daysToAdd += 7;
  }
  return addDays(now, daysToAdd);
}

export function parseScheduledTime(timeStr: string, timezone?: string): Date {
  const now = new Date();
  const lowerStr = timeStr.toLowerCase();
  
  // Day of week mapping
  const dayMap: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };
  
  if (lowerStr.includes("tomorrow")) {
    const tomorrow = addDays(now, 1);
    const time = extractTime(lowerStr);
    if (time) {
      return setMinutes(setHours(tomorrow, time.hours), time.minutes);
    }
    return setHours(tomorrow, 9);
  }
  
  if (lowerStr.includes("today")) {
    const time = extractTime(lowerStr);
    if (time) {
      return setMinutes(setHours(now, time.hours), time.minutes);
    }
    return setHours(now, 9);
  }
  
  // Handle "next [day]" - e.g., "next Monday" (always means the week after, not this week)
  const nextDayMatch = lowerStr.match(/next\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)/i);
  if (nextDayMatch) {
    const dayName = nextDayMatch[1].toLowerCase();
    const targetDay = dayMap[dayName];
    if (targetDay !== undefined) {
      // "next Monday" means the Monday in the next week (7+ days from now)
      const currentDay = getDay(now);
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7; // If same day or past, go to next week
      daysToAdd += 7; // Add a week because "next" means the week after
      const targetDate = addDays(now, daysToAdd);
      const time = extractTime(lowerStr);
      if (time) {
        return setMinutes(setHours(targetDate, time.hours), time.minutes);
      }
      return setHours(targetDate, 9);
    }
  }
  
  // Handle "this [day]" or "[day]" or "upcoming [day]" - e.g., "this Monday", "Monday", "upcoming Monday"
  const thisDayMatch = lowerStr.match(/(this\s+|upcoming\s+|this\s+upcoming\s+)?(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)/i);
  if (thisDayMatch) {
    const dayName = thisDayMatch[2].toLowerCase();
    const targetDay = dayMap[dayName];
    if (targetDay !== undefined) {
      const targetDate = getNextDayOfWeek(targetDay, false);
      const time = extractTime(lowerStr);
      if (time) {
        return setMinutes(setHours(targetDate, time.hours), time.minutes);
      }
      return setHours(targetDate, 9);
    }
  }
  
  if (lowerStr.includes("next week")) {
    const time = extractTime(lowerStr);
    const targetDate = addDays(now, 7);
    if (time) {
      return setMinutes(setHours(targetDate, time.hours), time.minutes);
    }
    return setHours(targetDate, 9);
  }
  
  const dateMatch = lowerStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;
    const time = extractTime(lowerStr);
    const parsed = new Date(fullYear, month - 1, day, time?.hours || 9, time?.minutes || 0);
    if (isValid(parsed)) return parsed;
  }
  
  // Try to extract just a time for today
  const time = extractTime(lowerStr);
  if (time) {
    return setMinutes(setHours(now, time.hours), time.minutes);
  }
  
  return addDays(setHours(now, 9), 1);
}

export interface CommandContext {
  currentCaseId?: string;
  currentDealId?: string;
  timezone?: string;
}

export interface CommandResult {
  navigateTo?: string;
  errorMessage?: string;
  successMessage?: string;
  responseMessage?: string;
  actionLink?: {
    label: string;
    href: string;
  };
}

export async function searchCaseByName(caseName: string): Promise<{ id: string; title: string } | null> {
  try {
    const res = await fetch(`/api/cases/search?name=${encodeURIComponent(caseName)}`, {
      credentials: "include",
    });
    const cases = await res.json();
    if (cases && cases.length > 0) {
      return { id: cases[0].id, title: cases[0].title };
    }
    return null;
  } catch (err) {
    console.error("[CommandRouter] Case search error:", err);
    return null;
  }
}

export async function searchDealByName(dealName: string): Promise<{ id: string; title: string } | null> {
  try {
    const res = await fetch(`/api/deals?search=${encodeURIComponent(dealName)}`, {
      credentials: "include",
    });
    const deals = await res.json();
    if (deals && deals.length > 0) {
      // Find best match
      const normalizedSearch = dealName.toLowerCase().replace(/[^\w\s]/g, "");
      const match = deals.find((d: any) => 
        d.title.toLowerCase().replace(/[^\w\s]/g, "").includes(normalizedSearch) ||
        normalizedSearch.includes(d.title.toLowerCase().replace(/[^\w\s]/g, ""))
      );
      return match ? { id: match.id, title: match.title } : { id: deals[0].id, title: deals[0].title };
    }
    return null;
  } catch (err) {
    console.error("[CommandRouter] Deal search error:", err);
    return null;
  }
}

export async function executeAvaCommand(
  intent: string,
  parameters: Record<string, any>,
  context: CommandContext,
  callbacks: {
    navigate: (path: string) => void;
    showToast?: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void;
    closeDrawer?: () => void;
  }
): Promise<CommandResult> {
  const { navigate, showToast, closeDrawer } = callbacks;

  switch (intent) {
    case "navigate_to_case": {
      // Build URL with filter parameters if present
      const buildCaseUrl = (caseId: string) => {
        let url = `/cases/${caseId}`;
        const queryParams: string[] = [];
        
        if (parameters.filterPerson) {
          queryParams.push(`filterPerson=${encodeURIComponent(parameters.filterPerson)}`);
        }
        if (parameters.filterKeyword) {
          queryParams.push(`filterKeyword=${encodeURIComponent(parameters.filterKeyword)}`);
        }
        if (parameters.filterTab) {
          queryParams.push(`tab=${encodeURIComponent(parameters.filterTab)}`);
        }
        
        if (queryParams.length > 0) {
          url += `?${queryParams.join('&')}`;
        }
        return url;
      };
      
      if (parameters.caseId) {
        const url = buildCaseUrl(parameters.caseId);
        navigate(url);
        closeDrawer?.();
        return { navigateTo: url };
      } else if (parameters.caseName) {
        const foundCase = await searchCaseByName(parameters.caseName);
        if (foundCase) {
          const url = buildCaseUrl(foundCase.id);
          navigate(url);
          closeDrawer?.();
          return { navigateTo: url };
        } else {
          return {
            errorMessage: `I couldn't find a case matching "${parameters.caseName}". Try saying the full case name or navigate to Cases to see the list.`,
          };
        }
      }
      return { errorMessage: "No case specified" };
    }

    case "navigate_to_case_document_review":
    case "navigate_to_case_email_filter": {
      const caseId = parameters.caseId || context?.currentCaseId;
      const caseName = parameters.caseName;
      
      const buildDocReviewUrl = (id: string) => {
        let url = `/document-review?caseId=${id}`;
        if (parameters.emailFilter?.participants) {
          url += `&participants=${encodeURIComponent(parameters.emailFilter.participants.join(","))}`;
        }
        if (parameters.searchQuery) {
          url += `&search=${encodeURIComponent(parameters.searchQuery)}`;
        }
        return url;
      };

      if (caseId) {
        const url = buildDocReviewUrl(caseId);
        navigate(url);
        closeDrawer?.();
        return { navigateTo: url };
      } else if (caseName) {
        const foundCase = await searchCaseByName(caseName);
        if (foundCase) {
          const url = buildDocReviewUrl(foundCase.id);
          navigate(url);
          closeDrawer?.();
          return { navigateTo: url };
        } else {
          return { errorMessage: `I couldn't find a case matching "${caseName}".` };
        }
      }
      return { errorMessage: "No case specified for document review" };
    }

    case "navigate_to_my_queue":
      navigate("/pe/deals");
      closeDrawer?.();
      return { navigateTo: "/pe/deals" };

    case "navigate_to_interviews": {
      const caseId = parameters.caseId || context?.currentCaseId;
      if (caseId) {
        navigate(`/cases/${caseId}/interviews`);
      } else {
        navigate("/interviews");
      }
      closeDrawer?.();
      return { navigateTo: caseId ? `/cases/${caseId}/interviews` : "/interviews" };
    }

    case "navigate_to_chat_conversations":
      navigate("/chat-review");
      closeDrawer?.();
      return { navigateTo: "/chat-review" };

    case "navigate_to_document_sets": {
      const caseId = parameters.caseId || context?.currentCaseId;
      if (caseId) {
        navigate(`/cases/${caseId}/document-sets`);
      } else {
        navigate("/document-sets");
      }
      closeDrawer?.();
      return { navigateTo: caseId ? `/cases/${caseId}/document-sets` : "/document-sets" };
    }

    case "navigate_to_findings": {
      const caseId = parameters.caseId || context?.currentCaseId;
      if (caseId) {
        navigate(`/cases/${caseId}/findings`);
      } else {
        navigate("/cases");
      }
      closeDrawer?.();
      return { navigateTo: caseId ? `/cases/${caseId}/findings` : "/cases" };
    }

    case "navigate_to_cases":
    case "navigate_to_cases_with_filter":
      if (parameters.filter) {
        navigate(`/cases?filter=${encodeURIComponent(parameters.filter)}`);
        return { navigateTo: `/cases?filter=${encodeURIComponent(parameters.filter)}` };
      }
      navigate("/cases");
      closeDrawer?.();
      return { navigateTo: "/cases" };

    case "navigate_to_data_room_document": {
      if (parameters.actionLink) {
        navigate(parameters.actionLink);
        closeDrawer?.();
        return { 
          navigateTo: parameters.actionLink,
          successMessage: `Navigating to ${parameters.documentName || 'document'}`,
        };
      } else if (parameters.dataRoomId && parameters.documentId) {
        const url = `/transactions/data-rooms/${parameters.dataRoomId}?document=${parameters.documentId}`;
        navigate(url);
        closeDrawer?.();
        return { navigateTo: url };
      }
      return { errorMessage: "Could not navigate to the document. Please try again." };
    }

    case "schedule_interview": {
      if (parameters.intervieweeName && parameters.intervieweeEmail && parameters.scheduledTime) {
        const caseId = parameters.caseId || context?.currentCaseId;
        if (!caseId) {
          return { errorMessage: "Please specify which case this interview is for." };
        }
        
        try {
          const scheduledFor = parseScheduledTime(parameters.scheduledTime, context?.timezone);
          
          const response = await apiRequest("POST", "/api/interviews", {
            caseId,
            intervieweeName: parameters.intervieweeName,
            intervieweeEmail: parameters.intervieweeEmail,
            scheduledFor: scheduledFor.toISOString(),
            interviewType: "witness",
            interviewerIds: [],
          });
          
          const interview = await response.json();
          
          if (parameters.sendEmail !== false) {
            try {
              await apiRequest("POST", "/api/email/interview-invite", {
                interviewId: interview.id,
                recipientEmail: parameters.intervieweeEmail,
                recipientName: parameters.intervieweeName,
              });
            } catch (emailErr) {
              console.log("[CommandRouter] Email invite not sent:", emailErr);
            }
          }
          
          showToast?.({
            title: "Interview Scheduled",
            description: `Interview with ${parameters.intervieweeName} scheduled for ${scheduledFor.toLocaleDateString()} at ${scheduledFor.toLocaleTimeString()}`,
          });
          
          navigate(`/cases/${caseId}/interviews`);
          closeDrawer?.();
          return { 
            navigateTo: `/cases/${caseId}/interviews`,
            successMessage: `Interview scheduled with ${parameters.intervieweeName}`,
          };
        } catch (err) {
          console.error("[CommandRouter] Failed to schedule interview:", err);
          return { errorMessage: "Failed to schedule the interview. Please try again." };
        }
      } else if (parameters.scheduledTime) {
        navigate("/interviews");
        showToast?.({
          title: "Interview Scheduling",
          description: "Enter the platform to complete interview scheduling with full details.",
        });
        closeDrawer?.();
        return { navigateTo: "/interviews" };
      }
      navigate("/interviews");
      closeDrawer?.();
      return { navigateTo: "/interviews" };
    }

    case "query_case_interview_count":
    case "query_case_document_count":
    case "query_case_findings_count":
    case "query_case_communications_count": {
      if (parameters.caseName) {
        try {
          const response = await fetch("/api/ava/case-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              queryType: intent,
              caseName: parameters.caseName,
            }),
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            return {
              responseMessage: result.message || "I'm sorry, I couldn't fetch that information right now. Please try again.",
            };
          }
          
          if (result.success && result.caseFound) {
            return {
              responseMessage: result.message,
              actionLink: result.navigateTo ? {
                label: `View ${intent.includes('interview') ? 'Interviews' : intent.includes('finding') ? 'Findings' : 'Documents'}`,
                href: result.navigateTo,
              } : undefined,
            };
          } else {
            return {
              responseMessage: result.message || `I couldn't find a case matching "${parameters.caseName}". Please check the case name and try again.`,
            };
          }
        } catch (err) {
          console.error("[CommandRouter] Failed to fetch case data:", err);
          return {
            responseMessage: "I'm sorry, I had trouble looking up that information. Please try again.",
          };
        }
      } else {
        return {
          responseMessage: "I'd be happy to help! Could you please tell me which case you're asking about?",
        };
      }
    }

    // ===== Business Transaction Intents =====
    case "navigate_to_transactions":
    case "open_transactions":
      navigate("/transactions/deals");
      closeDrawer?.();
      return { navigateTo: "/transactions/deals" };

    case "navigate_to_deal": {
      if (parameters.dealId) {
        navigate(`/transactions/deals/${parameters.dealId}`);
        closeDrawer?.();
        return { navigateTo: `/transactions/deals/${parameters.dealId}` };
      } else if (parameters.dealName) {
        const foundDeal = await searchDealByName(parameters.dealName);
        if (foundDeal) {
          navigate(`/transactions/deals/${foundDeal.id}`);
          closeDrawer?.();
          return { navigateTo: `/transactions/deals/${foundDeal.id}` };
        } else {
          return {
            errorMessage: `I couldn't find a transaction matching "${parameters.dealName}". Try using part of the name or navigate to Transactions to see the list.`,
          };
        }
      }
      return { errorMessage: "No transaction specified" };
    }

    case "navigate_to_statement": {
      if (parameters.statementId) {
        const url = `/statements/${parameters.statementId}`;
        navigate(url);
        closeDrawer?.();
        return { 
          navigateTo: url,
          successMessage: `Opening ${parameters.statementTitle || "recorded statement"}`,
        };
      }
      return { errorMessage: "No statement specified" };
    }

    case "navigate_to_case_recordings": {
      const caseId = parameters.caseId || context?.currentCaseId;
      const caseName = parameters.caseName;
      
      const buildRecordingsUrl = (id: string) => {
        let url = `/cases/${id}?tab=recordings`;
        if (parameters.searchQuery) {
          url += `&search=${encodeURIComponent(parameters.searchQuery)}`;
        }
        return url;
      };

      if (caseId) {
        const url = buildRecordingsUrl(caseId);
        navigate(url);
        closeDrawer?.();
        return { navigateTo: url };
      } else if (caseName) {
        const foundCase = await searchCaseByName(caseName);
        if (foundCase) {
          const url = buildRecordingsUrl(foundCase.id);
          navigate(url);
          closeDrawer?.();
          return { navigateTo: url };
        } else {
          return { errorMessage: `I couldn't find a case matching "${caseName}".` };
        }
      }
      return { errorMessage: "No case specified for recordings" };
    }

    case "navigate_to_deal_data_room": {
      const dealId = parameters.dealId || context?.currentDealId;
      const dealName = parameters.dealName;

      if (dealId) {
        navigate(`/transactions/deals/${dealId}/data-rooms`);
        closeDrawer?.();
        return { navigateTo: `/transactions/deals/${dealId}/data-rooms` };
      } else if (dealName) {
        const foundDeal = await searchDealByName(dealName);
        if (foundDeal) {
          navigate(`/transactions/deals/${foundDeal.id}/data-rooms`);
          closeDrawer?.();
          return { navigateTo: `/transactions/deals/${foundDeal.id}/data-rooms` };
        } else {
          return {
            errorMessage: `I couldn't find a transaction matching "${dealName}".`,
          };
        }
      }
      return { errorMessage: "Please specify which transaction's data room you want to view." };
    }

    case "navigate_to_data_room_document_resolved": {
      const documentId = parameters.documentId;
      const dataRoomId = parameters.dataRoomId;
      const resolvedDocumentName = parameters.resolvedDocumentName;

      if (dataRoomId && documentId) {
        const navUrl = `/transactions/data-rooms/${dataRoomId}?document=${documentId}`;
        navigate(navUrl);
        closeDrawer?.();
        return {
          navigateTo: navUrl,
          responseMessage: `Opening "${resolvedDocumentName || 'document'}" in the data room...`,
        };
      }
      
      return {
        errorMessage: parameters.errorMessage || "I couldn't find that document. Please check the document name and try again.",
        actionLink: {
          label: "Browse Transactions",
          href: "/transactions",
        },
      };
    }

    case "search_deal_documents": {
      const dealId = parameters.dealId || context?.currentDealId;
      const dealName = parameters.dealName;
      const query = parameters.query;

      if (!query) {
        return { errorMessage: "Please tell me what you'd like to search for in the transaction documents." };
      }

      let targetDealId = dealId;
      let targetDealTitle = "";

      if (!targetDealId && dealName) {
        const foundDeal = await searchDealByName(dealName);
        if (foundDeal) {
          targetDealId = foundDeal.id;
          targetDealTitle = foundDeal.title;
        } else {
          return {
            errorMessage: `I couldn't find a transaction matching "${dealName}".`,
          };
        }
      }

      if (!targetDealId) {
        return { errorMessage: "Please specify which transaction you'd like to search documents in." };
      }

      try {
        const response = await apiRequest("POST", `/api/deals/${targetDealId}/search`, { query });
        const result = await response.json();

        return {
          responseMessage: result.answer || "No results found for your search.",
          actionLink: {
            label: "View Transaction Documents",
            href: `/transactions/${targetDealId}/data-rooms`,
          },
        };
      } catch (err) {
        console.error("[CommandRouter] Failed to search deal documents:", err);
        return { errorMessage: "Failed to search documents. Please try again." };
      }
    }

    case "summarize_document": {
      const documentId = parameters.documentId;
      const documentName = parameters.documentName;

      if (!documentId && !documentName) {
        return { errorMessage: "Please specify which document you'd like me to summarize." };
      }

      try {
        let targetDocId = documentId;
        
        // If we have a document name but no ID, we'd need to search for it
        // For now, just work with the document ID
        if (!targetDocId) {
          return { errorMessage: "I need the document ID to generate a summary. Please select the document from the data room." };
        }

        const response = await apiRequest("POST", `/api/documents/${targetDocId}/summarize`, {});
        const result = await response.json();

        return {
          responseMessage: result.summary || "Unable to generate summary.",
        };
      } catch (err) {
        console.error("[CommandRouter] Failed to summarize document:", err);
        return { errorMessage: "Failed to summarize the document. Please try again." };
      }
    }

    case "compare_documents": {
      const documentId1 = parameters.documentId1;
      const documentId2 = parameters.documentId2;

      if (!documentId1 || !documentId2) {
        return { errorMessage: "I need two documents to compare. Please specify both document IDs." };
      }

      try {
        const response = await apiRequest("POST", "/api/documents/compare", {
          documentId1,
          documentId2,
        });
        const result = await response.json();

        let responseText = result.summary || "Comparison completed.\n\n";
        if (result.similarities?.length > 0) {
          responseText += `**Similarities:**\n${result.similarities.map((s: string) => `• ${s}`).join("\n")}\n\n`;
        }
        if (result.differences?.length > 0) {
          responseText += `**Differences:**\n${result.differences.map((d: string) => `• ${d}`).join("\n")}`;
        }

        return {
          responseMessage: responseText,
        };
      } catch (err) {
        console.error("[CommandRouter] Failed to compare documents:", err);
        return { errorMessage: "Failed to compare documents. Please try again." };
      }
    }

    case "analyze_deal_financials": {
      const dealId = parameters.dealId || context?.currentDealId;
      const dealName = parameters.dealName;

      let targetDealId = dealId;

      if (!targetDealId && dealName) {
        const foundDeal = await searchDealByName(dealName);
        if (foundDeal) {
          targetDealId = foundDeal.id;
        } else {
          return {
            errorMessage: `I couldn't find a transaction matching "${dealName}".`,
          };
        }
      }

      if (!targetDealId) {
        return { errorMessage: "Please specify which transaction you'd like me to analyze financials for." };
      }

      try {
        const response = await apiRequest("POST", `/api/deals/${targetDealId}/analyze-financials`, {});
        const result = await response.json();

        let responseText = "**Financial Analysis**\n\n";
        
        if (result.metrics && Object.keys(result.metrics).length > 0) {
          responseText += "**Key Metrics:**\n";
          for (const [key, value] of Object.entries(result.metrics)) {
            responseText += `• ${key}: ${value}\n`;
          }
          responseText += "\n";
        }
        
        if (result.insights?.length > 0) {
          responseText += "**Insights:**\n";
          result.insights.forEach((insight: string) => {
            responseText += `• ${insight}\n`;
          });
          responseText += "\n";
        }
        
        if (result.recommendations?.length > 0) {
          responseText += "**Recommendations:**\n";
          result.recommendations.forEach((rec: string) => {
            responseText += `• ${rec}\n`;
          });
        }

        return {
          responseMessage: responseText,
          actionLink: {
            label: "View Transaction",
            href: `/transactions/${targetDealId}`,
          },
        };
      } catch (err) {
        console.error("[CommandRouter] Failed to analyze financials:", err);
        return { errorMessage: "Failed to analyze financials. Please try again." };
      }
    }

    case "extract_contract_terms": {
      const documentId = parameters.documentId;

      if (!documentId) {
        return { errorMessage: "I need the document ID to extract contract terms. Please select the document from the data room." };
      }

      try {
        const response = await apiRequest("POST", `/api/documents/${documentId}/extract-terms`, {});
        const result = await response.json();

        let responseText = "**Contract Terms Extracted**\n\n";
        
        if (result.parties?.length > 0) {
          responseText += `**Parties:** ${result.parties.join(", ")}\n\n`;
        }
        
        if (result.effectiveDate) {
          responseText += `**Effective Date:** ${result.effectiveDate}\n`;
        }
        
        if (result.termLength) {
          responseText += `**Term:** ${result.termLength}\n\n`;
        }
        
        if (result.keyTerms?.length > 0) {
          responseText += "**Key Terms:**\n";
          result.keyTerms.forEach((term: { term: string; description: string }) => {
            responseText += `• ${term.term}: ${term.description}\n`;
          });
          responseText += "\n";
        }
        
        if (result.obligations?.length > 0) {
          responseText += "**Obligations:**\n";
          result.obligations.forEach((ob: { party: string; obligation: string }) => {
            responseText += `• ${ob.party}: ${ob.obligation}\n`;
          });
          responseText += "\n";
        }
        
        if (result.terminationClauses?.length > 0) {
          responseText += "**Termination Clauses:**\n";
          result.terminationClauses.forEach((clause: string) => {
            responseText += `• ${clause}\n`;
          });
        }

        return {
          responseMessage: responseText,
        };
      } catch (err) {
        console.error("[CommandRouter] Failed to extract contract terms:", err);
        return { errorMessage: "Failed to extract contract terms. Please try again." };
      }
    }

    case "search_all_transactions": {
      const query = parameters.query;

      if (!query) {
        return { errorMessage: "Please tell me what you'd like to search for across all transactions." };
      }

      try {
        const response = await apiRequest("POST", "/api/transactions/search", { query });
        const result = await response.json();

        let responseText = result.answer || "No results found for your search.";
        
        if (result.dealResults?.length > 0) {
          responseText += "\n\n**Transactions with relevant documents:**\n";
          result.dealResults.forEach((deal: { dealTitle: string }) => {
            responseText += `• ${deal.dealTitle}\n`;
          });
        }

        return {
          responseMessage: responseText,
          actionLink: {
            label: "View All Transactions",
            href: "/transactions",
          },
        };
      } catch (err) {
        console.error("[CommandRouter] Failed to search transactions:", err);
        return { errorMessage: "Failed to search transactions. Please try again." };
      }
    }

    case "create_calendar_event": {
      const title = parameters.title || "Meeting";
      const startTimeStr = parameters.startTime;
      const attendees = parameters.attendees || [];
      const duration = parameters.duration || 60;
      const eventType = parameters.eventType || "meeting";

      if (!startTimeStr) {
        return { errorMessage: "I need a date and time for this event. Please specify when you'd like to schedule it." };
      }

      try {
        // Parse the natural language time using our helper
        const startDate = parseScheduledTime(startTimeStr, context?.timezone);
        const endDate = addDays(startDate, 0); // Clone
        endDate.setMinutes(endDate.getMinutes() + duration);

        // Create the calendar event via API
        // Note: We don't include externalAttendees since we only have names from voice,
        // and the backend requires email/phone for invitees
        const response = await apiRequest("POST", "/api/calendar/events", {
          title,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          eventType,
          description: attendees.length > 0 ? `Meeting with ${attendees.join(", ")}` : undefined,
          isAllDay: false,
          reminderMinutes: 15,
        });

        if (!response.ok) {
          throw new Error("Failed to create calendar event");
        }

        const event = await response.json();
        
        const formattedDate = startDate.toLocaleDateString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const formattedTime = startDate.toLocaleTimeString(undefined, { 
          hour: 'numeric', 
          minute: '2-digit' 
        });

        showToast?.({
          title: "Event Created",
          description: `${title} scheduled for ${formattedDate} at ${formattedTime}`,
        });

        navigate("/calendar");
        closeDrawer?.();

        return {
          navigateTo: "/calendar",
          successMessage: `I've created "${title}" for ${formattedDate} at ${formattedTime}.`,
          responseMessage: `Done! I've added "${title}" to your calendar for ${formattedDate} at ${formattedTime}.`,
          actionLink: {
            label: "View Calendar",
            href: "/calendar",
          },
        };
      } catch (err) {
        console.error("[CommandRouter] Failed to create calendar event:", err);
        return { 
          errorMessage: "Failed to create the calendar event. Please try again or create it manually.",
          actionLink: {
            label: "Go to Calendar",
            href: "/calendar",
          },
        };
      }
    }

    case "start_video_conference":
    case "navigate_to_video_meeting":
    case "create_video_meeting": {
      const title = parameters.title || "Quick Video Call";
      const meetingType = parameters.meetingType || "witness_interview";
      const caseId = parameters.caseId || context?.currentCaseId;

      try {
        // Create a new video meeting
        const response = await apiRequest("POST", "/api/video-meetings", {
          title,
          meetingType,
          caseId: caseId || null,
          description: parameters.description || "Video conference started via Emma",
          waitingRoomEnabled: "false",
          recordingEnabled: "false",
          transcriptionEnabled: "false",
          screenSharingAllowed: "true",
          chatEnabled: "true",
        });

        if (!response.ok) {
          throw new Error("Failed to create video meeting");
        }

        const meeting = await response.json();
        const meetingUrl = `/video-meeting/${meeting.roomId}`;

        // Navigate to the video meeting
        navigate(meetingUrl);
        closeDrawer?.();

        return {
          navigateTo: meetingUrl,
          successMessage: `Video conference "${title}" created! Joining now...`,
        };
      } catch (err) {
        console.error("[CommandRouter] Failed to create video meeting:", err);
        return { 
          errorMessage: "Failed to start video conference. Please try again.",
          actionLink: {
            label: "Go to Interviews",
            href: "/interviews",
          },
        };
      }
    }

    // ===== Platform Navigation Intents =====
    case "navigate_to_relationship_intelligence":
      navigate("/relationship-intelligence");
      closeDrawer?.();
      return { navigateTo: "/relationship-intelligence" };

    case "navigate_to_contacts":
      navigate("/relationship-contacts");
      closeDrawer?.();
      return { navigateTo: "/relationship-contacts" };

    case "navigate_to_client_intelligence":
      navigate("/pe/deal-intelligence");
      closeDrawer?.();
      return { navigateTo: "/pe/deal-intelligence" };

    case "navigate_to_deal_templates":
      navigate("/transactions/templates");
      closeDrawer?.();
      return { navigateTo: "/transactions/templates" };

    case "navigate_to_request_lists":
      navigate("/transactions/request-lists");
      closeDrawer?.();
      return { navigateTo: "/transactions/request-lists" };

    case "navigate_to_deal_chat":
      navigate("/deal-chat");
      closeDrawer?.();
      return { navigateTo: "/deal-chat" };

    case "navigate_to_data_rooms":
      navigate("/transactions/data-rooms");
      closeDrawer?.();
      return { navigateTo: "/transactions/data-rooms" };

    case "navigate_to_deal_pipeline":
      navigate("/pe/deals");
      closeDrawer?.();
      return { navigateTo: "/pe/deals" };

    case "navigate_to_due_diligence":
      navigate("/transactions/checklists");
      closeDrawer?.();
      return { navigateTo: "/transactions/checklists" };

    case "navigate_to_privileged_research":
      navigate("/privileged-research");
      closeDrawer?.();
      return { navigateTo: "/privileged-research" };

    case "navigate_to_calendar":
      navigate("/calendar");
      closeDrawer?.();
      return { navigateTo: "/calendar" };

    case "navigate_to_ambient_intelligence":
      navigate("/ambient-intelligence");
      closeDrawer?.();
      return { navigateTo: "/ambient-intelligence" };

    case "navigate_to_document_review":
      navigate("/document-review");
      closeDrawer?.();
      return { navigateTo: "/document-review" };

    case "navigate_to_issue_heatmap":
      navigate("/issue-heatmap");
      closeDrawer?.();
      return { navigateTo: "/issue-heatmap" };

    case "navigate_to_data_lake":
      navigate("/my-data-lake");
      closeDrawer?.();
      return { navigateTo: "/my-data-lake" };

    case "navigate_to_collections":
      navigate("/collections");
      closeDrawer?.();
      return { navigateTo: "/collections" };

    case "navigate_to_background_research":
      navigate("/background-research");
      closeDrawer?.();
      return { navigateTo: "/background-research" };

    case "navigate_to_business_intelligence":
      navigate("/business-intelligence");
      closeDrawer?.();
      return { navigateTo: "/business-intelligence" };

    case "navigate_to_mailbox":
      navigate("/mailbox");
      closeDrawer?.();
      return { navigateTo: "/mailbox" };

    case "navigate_to_dashboard":
      navigate("/dashboard");
      closeDrawer?.();
      return { navigateTo: "/dashboard" };

    case "navigate_to_analytics":
      navigate("/analytics");
      closeDrawer?.();
      return { navigateTo: "/analytics" };

    case "navigate_to_admin":
      navigate("/admin");
      closeDrawer?.();
      return { navigateTo: "/admin" };

    case "navigate_to_deal_checklists":
      navigate("/transactions/checklists");
      closeDrawer?.();
      return { navigateTo: "/transactions/checklists" };

    case "navigate_to_investor_memo": {
      if (parameters.memoId) {
        navigate(`/investor-memo/${parameters.memoId}`);
        closeDrawer?.();
        return { navigateTo: `/investor-memo/${parameters.memoId}` };
      }
      navigate("/pe/deals");
      closeDrawer?.();
      return {
        navigateTo: "/pe/deals",
        responseMessage: "Select a deal to generate an investment memo.",
      };
    }

    // ===== Draft & Create Action Intents =====
    case "draft_note": {
      const queryParts: string[] = [];
      if (parameters.topic) queryParts.push(`draftNote=${encodeURIComponent(parameters.topic)}`);
      else queryParts.push("draftNote=true");
      if (parameters.contactName) queryParts.push(`contact=${encodeURIComponent(parameters.contactName)}`);
      if (parameters.alertId) queryParts.push(`alertId=${encodeURIComponent(parameters.alertId)}`);
      const url = `/relationship-intelligence${queryParts.length ? '?' + queryParts.join('&') : ''}`;
      navigate(url);
      closeDrawer?.();
      return {
        navigateTo: url,
        successMessage: parameters.topic
          ? `Taking you to draft a note about "${parameters.topic}".`
          : "Taking you to draft a note.",
      };
    }

    case "draft_email": {
      const queryParts: string[] = [];
      if (parameters.topic) queryParts.push(`draftEmail=${encodeURIComponent(parameters.topic)}`);
      else queryParts.push("draftEmail=true");
      if (parameters.recipientName) queryParts.push(`recipient=${encodeURIComponent(parameters.recipientName)}`);
      if (parameters.contactName) queryParts.push(`contact=${encodeURIComponent(parameters.contactName)}`);
      if (parameters.alertId) queryParts.push(`alertId=${encodeURIComponent(parameters.alertId)}`);
      const url = `/relationship-intelligence${queryParts.length ? '?' + queryParts.join('&') : ''}`;
      navigate(url);
      closeDrawer?.();
      return {
        navigateTo: url,
        successMessage: parameters.recipientName
          ? `Taking you to draft an email to ${parameters.recipientName}.`
          : "Taking you to draft an email.",
      };
    }

    case "draft_linkedin": {
      const queryParts: string[] = [];
      if (parameters.topic) queryParts.push(`draftLinkedIn=${encodeURIComponent(parameters.topic)}`);
      else queryParts.push("draftLinkedIn=true");
      if (parameters.contactName) queryParts.push(`contact=${encodeURIComponent(parameters.contactName)}`);
      if (parameters.alertId) queryParts.push(`alertId=${encodeURIComponent(parameters.alertId)}`);
      const url = `/relationship-intelligence${queryParts.length ? '?' + queryParts.join('&') : ''}`;
      navigate(url);
      closeDrawer?.();
      return {
        navigateTo: url,
        successMessage: parameters.topic
          ? `Taking you to draft a LinkedIn post about "${parameters.topic}".`
          : "Taking you to draft a LinkedIn post.",
      };
    }

    case "create_deal": {
      const queryParts: string[] = ["createDeal=true"];
      if (parameters.title) queryParts.push(`title=${encodeURIComponent(parameters.title)}`);
      if (parameters.dealType) queryParts.push(`dealType=${encodeURIComponent(parameters.dealType)}`);
      const url = `/transactions/deals?${queryParts.join('&')}`;
      navigate(url);
      closeDrawer?.();
      return {
        navigateTo: url,
        successMessage: parameters.title
          ? `Taking you to create the "${parameters.title}" deal.`
          : "Taking you to create a new deal.",
      };
    }

    case "create_contact": {
      const queryParts: string[] = ["createContact=true"];
      if (parameters.name) queryParts.push(`name=${encodeURIComponent(parameters.name)}`);
      if (parameters.company) queryParts.push(`company=${encodeURIComponent(parameters.company)}`);
      const url = `/relationship-contacts?${queryParts.join('&')}`;
      navigate(url);
      closeDrawer?.();
      return {
        navigateTo: url,
        successMessage: parameters.name
          ? `Taking you to add ${parameters.name} as a contact.`
          : "Taking you to create a new contact.",
      };
    }

    case "upload_to_data_lake": {
      navigate("/my-data-lake?upload=true");
      closeDrawer?.();
      return {
        navigateTo: "/my-data-lake?upload=true",
        successMessage: "Taking you to your data lake to upload documents.",
      };
    }

    case "generate_investment_memo": {
      if (parameters.dealName) {
        const foundDeal = await searchDealByName(parameters.dealName);
        if (foundDeal) {
          navigate(`/transactions/deals/${foundDeal.id}?generateMemo=true`);
          closeDrawer?.();
          return {
            navigateTo: `/transactions/deals/${foundDeal.id}?generateMemo=true`,
            successMessage: `Taking you to generate an investment memo for ${foundDeal.title}.`,
          };
        }
        return { errorMessage: `I couldn't find a deal matching "${parameters.dealName}".` };
      }
      navigate("/pe/deals?generateMemo=true");
      closeDrawer?.();
      return {
        navigateTo: "/pe/deals?generateMemo=true",
        responseMessage: "Select a deal to generate an investment memo.",
      };
    }

    case "share_deal": {
      if (parameters.dealName) {
        const foundDeal = await searchDealByName(parameters.dealName);
        if (foundDeal) {
          navigate(`/transactions/deals/${foundDeal.id}?shareDeal=true`);
          closeDrawer?.();
          return {
            navigateTo: `/transactions/deals/${foundDeal.id}?shareDeal=true`,
            successMessage: `Taking you to share the ${foundDeal.title} deal.`,
          };
        }
        return { errorMessage: `I couldn't find a deal matching "${parameters.dealName}".` };
      }
      navigate("/transactions/deals?shareDeal=true");
      closeDrawer?.();
      return {
        navigateTo: "/transactions/deals?shareDeal=true",
        responseMessage: "Select a deal to share.",
      };
    }

    case "scan_news": {
      navigate("/relationship-intelligence?scanNews=true");
      closeDrawer?.();
      return {
        navigateTo: "/relationship-intelligence?scanNews=true",
        successMessage: "Taking you to scan news for your monitored contacts.",
      };
    }

    case "create_request_list": {
      navigate("/transactions/request-lists?create=true");
      closeDrawer?.();
      return {
        navigateTo: "/transactions/request-lists?create=true",
        successMessage: "Taking you to create a new request list.",
      };
    }

    case "create_checklist": {
      navigate("/transactions/checklists?create=true");
      closeDrawer?.();
      return {
        navigateTo: "/transactions/checklists?create=true",
        successMessage: "Taking you to create a new checklist.",
      };
    }

    case "start_due_diligence": {
      if (parameters.dealName) {
        const foundDeal = await searchDealByName(parameters.dealName);
        if (foundDeal) {
          navigate(`/transactions/deals/${foundDeal.id}?startDD=true`);
          closeDrawer?.();
          return {
            navigateTo: `/transactions/deals/${foundDeal.id}?startDD=true`,
            successMessage: `Starting due diligence for ${foundDeal.title}.`,
          };
        }
        return { errorMessage: `I couldn't find a deal matching "${parameters.dealName}".` };
      }
      navigate("/transactions/checklists?create=true");
      closeDrawer?.();
      return {
        navigateTo: "/transactions/checklists?create=true",
        responseMessage: "Taking you to start a due diligence checklist.",
      };
    }

    case "start_privileged_research": {
      const queryParts: string[] = [];
      if (parameters.topic) queryParts.push(`topic=${encodeURIComponent(parameters.topic)}`);
      const url = `/privileged-research${queryParts.length ? '?' + queryParts.join('&') : ''}`;
      navigate(url);
      closeDrawer?.();
      return {
        navigateTo: url,
        successMessage: parameters.topic
          ? `Starting privileged research on "${parameters.topic}".`
          : "Opening privileged research.",
      };
    }

    case "create_collection": {
      const queryParts: string[] = ["create=true"];
      if (parameters.name) queryParts.push(`name=${encodeURIComponent(parameters.name)}`);
      const url = `/collections?${queryParts.join('&')}`;
      navigate(url);
      closeDrawer?.();
      return {
        navigateTo: url,
        successMessage: parameters.name
          ? `Creating a collection called "${parameters.name}".`
          : "Taking you to create a new collection.",
      };
    }

    case "run_background_research": {
      const queryParts: string[] = [];
      if (parameters.targetName) queryParts.push(`target=${encodeURIComponent(parameters.targetName)}`);
      if (parameters.targetType) queryParts.push(`type=${encodeURIComponent(parameters.targetType)}`);
      const url = `/background-research${queryParts.length ? '?' + queryParts.join('&') : ''}`;
      navigate(url);
      closeDrawer?.();
      return {
        navigateTo: url,
        successMessage: parameters.targetName
          ? `Starting background research on ${parameters.targetName}.`
          : "Opening background research.",
      };
    }

    default:
      console.log("[CommandRouter] Unknown command intent:", intent);
      return { errorMessage: `Unknown command: ${intent}` };
  }
}
