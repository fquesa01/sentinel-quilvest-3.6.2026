import { TimelineSection } from "./timeline-section";

interface TimelineTabProps {
  caseId: string;
}

export function TimelineTab({ caseId }: TimelineTabProps) {
  return (
    <div>
      <TimelineSection caseId={caseId} />
    </div>
  );
}
