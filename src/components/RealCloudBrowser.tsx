import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface RealCloudBrowserProps {
  isExecuting?: boolean;
  onBrowserControl?: (action: string, data?: unknown) => void;
}

export default function RealCloudBrowser({ 
  isExecuting = false,
  onBrowserControl
}: RealCloudBrowserProps) {
  const [browserState, setBrowserState] = useState({
    url: '',
    isLoading: false,
    connected: false,
    streamUrl: '', // URL for live browser stream
    screenshot: ''
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const screenshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connect to backend and check for stream availability
  useEffect(() => {
    const checkStreamAvailability = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.browserStreamInfo);
        if (response.ok) {
          const data = await response.json();
          setBrowserState(prev => ({ 
            ...prev, 
            streamUrl: data.streamUrl || '',
            connected: true 
          }));
        }
      } catch {
        console.log('Backend not available');
      }
    };

    checkStreamAvailability();

    // Health check polling
    const healthInterval = setInterval(async () => {
      try {
        const response = await fetch(API_ENDPOINTS.health);
        if (response.ok) {
          setBrowserState(prev => ({ ...prev, connected: true }));
        }
      } catch {
        setBrowserState(prev => ({ ...prev, connected: false }));
      }
    }, 5000);

    // Poll for screenshots if no stream URL
    screenshotIntervalRef.current = setInterval(async () => {
      if (!browserState.streamUrl) {
        try {
          const response = await fetch(API_ENDPOINTS.browserState);
          if (response.ok) {
            const data = await response.json();
            if (data.screenshot) {
              setBrowserState(prev => ({ 
                ...prev, 
                screenshot: data.screenshot,
                url: data.url || prev.url
              }));
            }
          }
        } catch {
          // Silent fail
        }
      }
    }, 1000);

    return () => {
      clearInterval(healthInterval);
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
      }
    };
  }, [browserState.streamUrl]);

  const handleRunWorkflow = () => {
    onBrowserControl?.('run_workflow');
  };

  const handlePauseWorkflow = () => {
    onBrowserControl?.('pause_workflow');
  };

  const handleStopWorkflow = () => {
    onBrowserControl?.('stop_workflow');
  };

  const handleResetBrowser = async () => {
    try {
      await fetch(API_ENDPOINTS.browserControl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'reset' })
      });
      setBrowserState(prev => ({
        ...prev,
        url: '',
        screenshot: '',
        isLoading: false
      }));
      onBrowserControl?.('reset_browser');
    } catch (error) {
      console.error('Reset failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Browser Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${browserState.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {browserState.streamUrl ? '🔴 Live Browser' : '📸 Screenshot Mode'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunWorkflow}
            disabled={isExecuting}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
          >
            <Play size={14} />
            <span>Run</span>
          </button>
          <button
            onClick={handlePauseWorkflow}
            disabled={!isExecuting}
            className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
          >
            <Pause size={14} />
            <span>Pause</span>
          </button>
          <button
            onClick={handleStopWorkflow}
            disabled={!isExecuting}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
          >
            <Square size={14} />
            <span>Stop</span>
          </button>
          <button
            onClick={handleResetBrowser}
            className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors flex items-center space-x-1"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Browser Display */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        {/* Live Browser Iframe */}
        {browserState.streamUrl ? (
          <iframe
            ref={iframeRef}
            src={browserState.streamUrl}
            className="w-full h-full border-0 overflow-hidden"
            title="Live Browser Stream"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock"
            style={{
              overflow: 'hidden',
              border: 'none',
              outline: 'none'
            }}
          />
        ) : browserState.screenshot ? (
          /* Screenshot Mode */
          <img
            src={browserState.screenshot}
            alt="Browser"
            className="w-full h-full object-contain"
          />
        ) : (
          /* Waiting State */
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">🌐</div>
              <p className="text-sm">Waiting for browser session...</p>
              <p className="text-xs mt-1">Run a workflow to start</p>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {browserState.isLoading && (
          <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
            <span>Loading...</span>
          </div>
        )}

        {/* Live Indicator */}
        {browserState.streamUrl && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>LIVE</span>
          </div>
        )}

        {/* Current URL Display */}
        {browserState.url && (
          <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-xs">
            {browserState.url}
          </div>
        )}
      </div>
    </div>
  );
}
