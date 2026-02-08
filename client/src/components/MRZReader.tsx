import React, { useEffect, useRef, useState } from 'react';
import { initializeDynamosoft, handleMrzParseResult } from '@/lib/dynamsoft';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MRZResult {
  [key: string]: string | number;
}

interface OverlayManager {
  initOverlay(canvas: HTMLCanvasElement): void;
  updateOverlay(width: number, height: number): void;
  drawOverlay(localization: any, text: string): void;
}

export function MRZReader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mrzResult, setMrzResult] = useState<MRZResult>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const cvrRef = useRef<any>(null);
  const parserRef = useRef<any>(null);
  const overlayManagerRef = useRef<OverlayManager | null>(null);

  // Simple overlay manager implementation
  const createOverlayManager = (): OverlayManager => {
    let ctx: CanvasRenderingContext2D | null = null;

    return {
      initOverlay(canvas: HTMLCanvasElement) {
        ctx = canvas.getContext('2d');
      },
      updateOverlay(width: number, height: number) {
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      },
      drawOverlay(localization: any, text: string) {
        if (!ctx || !localization) return;
        ctx.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;

        if (localization.points && localization.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(localization.points[0].x, localization.points[0].y);
          for (let i = 1; i < localization.points.length; i++) {
            ctx.lineTo(localization.points[i].x, localization.points[i].y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      },
    };
  };

  useEffect(() => {
    const initMRZ = async () => {
      try {
        const { CodeParserModule, CaptureVisionRouter, CodeParser } =
          await import('dynamsoft-code-parser');
        
        await CodeParserModule.loadSpec('MRTD_TD1_ID');
        await CodeParserModule.loadSpec('MRTD_TD2_FRENCH_ID');
        await CodeParserModule.loadSpec('MRTD_TD2_ID');
        await CodeParserModule.loadSpec('MRTD_TD2_VISA');
        await CodeParserModule.loadSpec('MRTD_TD3_PASSPORT');
        await CodeParserModule.loadSpec('MRTD_TD3_VISA');

        await CaptureVisionRouter.appendModelBuffer('MRZCharRecognition');
        await CaptureVisionRouter.appendModelBuffer('MRZTextLineRecognition');

        cvrRef.current = await CaptureVisionRouter.createInstance();
        parserRef.current = await CodeParser.createInstance();

        overlayManagerRef.current = createOverlayManager();
        if (canvasRef.current) {
          overlayManagerRef.current.initOverlay(canvasRef.current);
        }

        await cvrRef.current.initSettings('assets/template.json').catch(() => {
          console.log('Template not found, using default settings');
        });

        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to initialize MRZ reader:', error);
        alert('Failed to initialize MRZ reader. Please ensure Dynamosoft libraries are installed.');
      }
    };

    initMRZ();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !cvrRef.current || !parserRef.current) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        if (imageRef.current) {
          imageRef.current.src = result;
          imageRef.current.onload = async () => {
            if (canvasRef.current && overlayManagerRef.current) {
              overlayManagerRef.current.updateOverlay(
                imageRef.current!.width,
                imageRef.current!.height
              );
            }

            try {
              const captureResult = await cvrRef.current.capture(file, 'ReadMRZ');
              let resultText = '';
              const extractedData: MRZResult = {};

              if (captureResult.items && captureResult.items.length > 0) {
                for (const item of captureResult.items) {
                  if (item.type === 3) {
                    // CRIT_TEXT_LINE
                    resultText += item.text + '\n';

                    if (overlayManagerRef.current && item.location) {
                      overlayManagerRef.current.drawOverlay(item.location, item.text);
                    }

                    try {
                      const parseResults = await parserRef.current.parse(item.text);
                      if (parseResults) {
                        const parsed = handleMrzParseResult(parseResults);
                        Object.assign(extractedData, parsed);
                        resultText += JSON.stringify(parsed, null, 2) + '\n';
                      }
                    } catch (parseError) {
                      console.error('Error parsing MRZ:', parseError);
                    }
                    break;
                  }
                }
              }

              if (Object.keys(extractedData).length === 0) {
                resultText = 'No MRZ detected.';
              }

              setMrzResult(extractedData);
              if (textAreaRef.current) {
                textAreaRef.current.value = resultText;
              }
            } catch (captureError) {
              console.error('Error capturing MRZ:', captureError);
              alert('Error reading document. Please try again.');
            }
          };
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Upload Document Image</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={!isLoaded || isProcessing}
          className="block w-full"
        />
      </div>

      {!isLoaded && (
        <div className="flex items-center justify-center p-4">
          <div className="text-sm text-gray-500">Initializing MRZ reader...</div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold">Document Preview</h3>
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <img ref={imageRef} alt="Document" className="max-w-full h-auto" />
          <canvas ref={canvasRef} className="absolute top-0 left-0 cursor-crosshair" />
        </div>
      </div>

      {Object.keys(mrzResult).length > 0 && (
        <div className="space-y-2 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold">Extracted Information</h3>
          <div className="space-y-1 text-sm">
            {Object.entries(mrzResult).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key}:</span>
                <span className="text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold">Raw Result</h3>
        <Textarea
          ref={textAreaRef}
          readOnly
          placeholder="Detection results will appear here"
          className="min-h-[120px] font-mono text-xs"
        />
      </div>
    </div>
  );
}
