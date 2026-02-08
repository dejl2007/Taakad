import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { handleMrzParseResult } from '@/lib/dynamsoft';

interface MRZResult {
  [key: string]: string | number;
}

interface OverlayManager {
  initOverlay(canvas: HTMLCanvasElement): void;
  updateOverlay(width: number, height: number): void;
  drawOverlay(localization: any, text: string): void;
}

export function MRZScanner() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [mrzResult, setMrzResult] = useState<MRZResult>({});
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const videoSelectRef = useRef<HTMLSelectElement>(null);

  const cvrRef = useRef<any>(null);
  const parserRef = useRef<any>(null);
  const cameraEnhancerRef = useRef<any>(null);
  const overlayManagerRef = useRef<OverlayManager | null>(null);
  const isDestroyedRef = useRef(false);

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
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';

        if (localization.points && localization.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(localization.points[0].x, localization.points[0].y);
          for (let i = 1; i < localization.points.length; i++) {
            ctx.lineTo(localization.points[i].x, localization.points[i].y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.fill();
        }
      },
    };
  };

  useEffect(() => {
    const initScanner = async () => {
      try {
        const {
          CodeParserModule,
          CaptureVisionRouter,
          CodeParser,
          CameraView,
          CameraEnhancer,
        } = await import('dynamsoft-capture-vision-bundle');

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

        await initBarcodeScanner(CameraView, CameraEnhancer);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to initialize MRZ scanner:', error);
        alert('Failed to initialize MRZ scanner. Please ensure Dynamosoft libraries are installed.');
      }
    };

    const initBarcodeScanner = async (CameraView: any, CameraEnhancer: any) => {
      try {
        const cameraView = await CameraView.createInstance();
        cameraEnhancerRef.current = await CameraEnhancer.createInstance(cameraView);

        if (videoContainerRef.current) {
          const uiElement = cameraView.getUIElement();
          videoContainerRef.current.appendChild(uiElement);

          // Hide camera and resolution selectors
          uiElement.shadowRoot?.querySelector('.dce-sel-camera')?.setAttribute('style', 'display: none');
          uiElement.shadowRoot?.querySelector('.dce-sel-resolution')?.setAttribute('style', 'display: none');

          const availableCameras = await cameraEnhancerRef.current.getAllCameras();
          setCameras(availableCameras);

          if (availableCameras.length > 0) {
            setSelectedCamera(availableCameras[0].deviceId);
          }

          if (cvrRef.current) {
            cvrRef.current.setInput(cameraEnhancerRef.current);

            cvrRef.current.addResultReceiver({
              onCapturedResultReceived: async (result: any) => {
                if (result.items && result.items.length > 0) {
                  let resultText = '';
                  const extractedData: MRZResult = {};

                  for (const item of result.items) {
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

                  if (Object.keys(extractedData).length > 0) {
                    setMrzResult(extractedData);
                    if (textAreaRef.current) {
                      textAreaRef.current.value = resultText;
                    }
                    // Auto-pause after successful scan
                    await cameraEnhancerRef.current.pause();
                    setIsScanning(false);
                  }
                }
              },
            });

            cameraEnhancerRef.current.on('played', () => {
              const canvas = canvasRef.current;
              if (canvas) {
                canvas.width = cameraEnhancerRef.current.getResolution()[0];
                canvas.height = cameraEnhancerRef.current.getResolution()[1];
              }
            });
          }
        }
      } catch (error) {
        console.error('Error initializing camera scanner:', error);
      }
    };

    initScanner();

    return () => {
      isDestroyedRef.current = true;
    };
  }, []);

  const startScanning = async () => {
    if (!cameraEnhancerRef.current || !cvrRef.current) return;

    try {
      setIsScanning(true);
      setMrzResult({});

      if (selectedCamera && cameraEnhancerRef.current) {
        const cameraInfo = cameras.find((c) => c.deviceId === selectedCamera);
        if (cameraInfo) {
          await cameraEnhancerRef.current.selectCamera(cameraInfo);
        }
      }

      await cameraEnhancerRef.current.play();
      await cvrRef.current.startCapturing('ReadMRZ');
    } catch (error) {
      console.error('Error starting scan:', error);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (cameraEnhancerRef.current && cvrRef.current) {
      try {
        await cvrRef.current.stopCapturing();
        await cameraEnhancerRef.current.pause();
        setIsScanning(false);
      } catch (error) {
        console.error('Error stopping scan:', error);
      }
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(e.target.value);
  };

  return (
    <div className="w-full space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Camera</label>
        <select
          ref={videoSelectRef}
          value={selectedCamera}
          onChange={handleCameraChange}
          disabled={isScanning || !isLoaded}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          {cameras.map((camera) => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${camera.deviceId.slice(0, 5)}`}
            </option>
          ))}
        </select>
      </div>

      {!isLoaded && (
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-gray-500">Initializing MRZ scanner...</div>
        </div>
      )}

      <div className="space-y-2" ref={videoContainerRef}></div>

      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={startScanning}
          disabled={!isLoaded || isScanning}
          className="flex-1"
        >
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </Button>
        <Button
          onClick={stopScanning}
          disabled={!isScanning}
          variant="outline"
          className="flex-1"
        >
          Stop Scan
        </Button>
      </div>

      {Object.keys(mrzResult).length > 0 && (
        <div className="space-y-2 bg-green-50 p-4 rounded-lg">
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
        <h3 className="text-sm font-semibold">Raw Result</h3>
        <Textarea
          ref={textAreaRef}
          readOnly
          placeholder="Scan results will appear here"
          className="min-h-[120px] font-mono text-xs"
        />
      </div>
    </div>
  );
}
