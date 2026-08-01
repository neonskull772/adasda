import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

let landmarkerInstance: HandLandmarker | null = null;
let isLoading = false;
let initPromise: Promise<HandLandmarker> | null = null;

export async function getHandLandmarker(onProgress?: (status: string) => void): Promise<HandLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      isLoading = true;
      onProgress?.('Loading vision engine WASM modules...');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      onProgress?.('Loading hand tracking neural network...');

      try {
        // Try GPU delegate first for hardware acceleration with dual hand tracking
        landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.35,
          minHandPresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });
      } catch (gpuErr) {
        console.warn('GPU acceleration fallback to CPU:', gpuErr);
        onProgress?.('Falling back to CPU neural network execution...');
        landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.35,
          minHandPresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });
      }

      onProgress?.('Hand tracking ready!');
      return landmarkerInstance;
    } catch (err) {
      console.error('Failed to initialize MediaPipe HandLandmarker:', err);
      initPromise = null;
      isLoading = false;
      throw err;
    } finally {
      isLoading = false;
    }
  })();

  return initPromise;
}

export function releaseHandLandmarker() {
  if (landmarkerInstance) {
    try {
      landmarkerInstance.close();
    } catch (e) {
      console.warn('Error closing hand landmarker:', e);
    }
    landmarkerInstance = null;
    initPromise = null;
  }
}
