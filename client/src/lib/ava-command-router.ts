import { addDays, setHours, setMinutes, isValid } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export function parseScheduledTime(timeStr: string, timezone?: string): Date {
  const now = new Date();
  const lowerStr = timeStr.toLowerCase();
  
  if (lowerStr.includes("tomorrow")) {
    const tomorrow = addDays(now, 1);
    const timeMatch = lowerStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const isPM = timeMatch[3]?.toLowerCase() === "pm";
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return setMinutes(setHours(tomorrow, hours), minutes);
    }
    return setHours(tomorrow, 9);
  }
  
  if (lowerStr.includes("today")) {
    const timeMatch = lowerStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const isPM = timeMatch[3]?.toLowerCase() === "pm";
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return setMinutes(setHours(now, hours), minutes);
    }
  }
  
  if (lowerStr.includes("next week")) {
    return addDays(setHours(now, 9), 7);
  }
  
  const dateMatch = lowerStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;
    const parsed = new Date(fullYear, month - 1, day, 9, 0);
    if (isValid(parsed)) return parsed;
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
      navigate("/my-queue");
      closeDrawer?.();
      return { navigateTo: "/my-queue" };

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
      navigate("/transactions");
      closeDrawer?.();
      return { navigateTo: "/transactions" };

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

    case "navigate_to_data_room_document": {
      // This intent is fully resolved by the server-side interpreter
      // It already finds the document and creates the navigation link
      // We just need to navigate to the resolved URL if available
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
      
      // Document wasn't found - the server already set an error message
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

    default:
      console.log("[CommandRouter] Unknown command intent:", intent);
      return { errorMessage: `Unknown command: ${intent}` };
  }
}
