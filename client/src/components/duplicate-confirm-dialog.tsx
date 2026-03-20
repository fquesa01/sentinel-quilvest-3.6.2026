import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, AlertCircle } from "lucide-react";

export type DuplicateFile = {
  fileName: string;
  fileSize: number;
};

type DuplicateConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateFile[];
  onConfirm: () => void;
  onCancel: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DuplicateConfirmDialog({
  open,
  onOpenChange,
  duplicates,
  onConfirm,
  onCancel,
}: DuplicateConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Duplicate {duplicates.length === 1 ? "File" : "Files"} Detected
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-3">
                {duplicates.length === 1
                  ? "A file with the same name and size already exists in this location:"
                  : `${duplicates.length} files with the same name and size already exist in this location:`}
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {duplicates.map((dup, i) => (
                  <div
                    key={`${dup.fileName}-${i}`}
                    className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
                    data-testid={`duplicate-file-${i}`}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-foreground">{dup.fileName}</span>
                    <span className="text-muted-foreground shrink-0">
                      {formatFileSize(dup.fileSize)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm">
                Would you like to upload {duplicates.length === 1 ? "this file" : "these files"} anyway?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid="button-skip-duplicates">
            Skip {duplicates.length === 1 ? "Duplicate" : "Duplicates"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid="button-upload-anyway">
            Upload Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
