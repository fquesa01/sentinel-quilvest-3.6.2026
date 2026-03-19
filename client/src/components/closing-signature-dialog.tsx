import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Eraser, PenTool, Type, Loader2 } from "lucide-react";

interface ClosingSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (signatureImage: string, signerName: string) => void;
  isPending: boolean;
  documentTitle: string;
}

type SignatureMode = "type" | "draw";

export function ClosingSignatureDialog({
  open,
  onOpenChange,
  onSign,
  isPending,
  documentTitle,
}: ClosingSignatureDialogProps) {
  const [mode, setMode] = useState<SignatureMode>("type");
  const [typedName, setTypedName] = useState("");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const CANVAS_HEIGHT = 120;

  useEffect(() => {
    if (open) {
      setTypedName("");
      setHasDrawing(false);
      setMode("type");
    }
  }, [open]);

  useEffect(() => {
    if (open && mode === "draw") {
      requestAnimationFrame(() => initCanvas());
    }
  }, [open, mode]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const width = container.clientWidth;
    canvas.width = width;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasDrawing(false);
  }, []);

  const getPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawing(true);
  }, [getPosition]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPosition(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPosition]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    initCanvas();
  }, [initCanvas]);

  const generateTypedSignature = useCallback((): string => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 400;
    tempCanvas.height = 120;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 120);
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "38px 'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 20, 60);
    return tempCanvas.toDataURL("image/png");
  }, [typedName]);

  const handleSign = useCallback(() => {
    let signatureImage: string;
    let signerName: string;

    if (mode === "type") {
      if (!typedName.trim()) return;
      signatureImage = generateTypedSignature();
      signerName = typedName.trim();
    } else {
      if (!hasDrawing || !typedName.trim()) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      signatureImage = canvas.toDataURL("image/png");
      signerName = typedName.trim();
    }

    onSign(signatureImage, signerName);
  }, [mode, typedName, hasDrawing, generateTypedSignature, onSign]);

  const canSubmit = mode === "type"
    ? typedName.trim().length > 0
    : hasDrawing && typedName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Signing: <span className="font-medium text-foreground">{documentTitle}</span>
          </p>

          <div className="flex gap-2">
            <Button
              variant={mode === "type" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("type")}
              data-testid="button-sign-mode-type"
            >
              <Type className="h-4 w-4 mr-1" />
              Type
            </Button>
            <Button
              variant={mode === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("draw")}
              data-testid="button-sign-mode-draw"
            >
              <PenTool className="h-4 w-4 mr-1" />
              Draw
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Full Legal Name</Label>
            <Input
              placeholder="Enter your full name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              data-testid="input-signer-name"
            />
          </div>

          {mode === "type" && typedName.trim() && (
            <div className="border rounded-md p-4 bg-white dark:bg-white min-h-[80px] flex items-center">
              <span
                className="text-3xl text-[#1a1a2e]"
                style={{ fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive" }}
                data-testid="text-signature-preview"
              >
                {typedName}
              </span>
            </div>
          )}

          {mode === "draw" && (
            <div className="space-y-2">
              <div ref={containerRef} className="border rounded-md overflow-hidden bg-white dark:bg-white w-full">
                <canvas
                  ref={canvasRef}
                  height={CANVAS_HEIGHT}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                  className="cursor-crosshair touch-none w-full"
                  style={{ height: `${CANVAS_HEIGHT}px` }}
                  data-testid="canvas-closing-signature"
                />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Draw your signature using mouse, finger, or stylus
                </p>
                <Button variant="outline" size="sm" onClick={clearCanvas} data-testid="button-clear-drawing">
                  <Eraser className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            By signing, you agree that this electronic signature is legally binding and the document status will be set to Executed.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel-sign"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={!canSubmit || isPending}
            data-testid="button-confirm-sign"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {isPending ? "Signing..." : "Sign Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}