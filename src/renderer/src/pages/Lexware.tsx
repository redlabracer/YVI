import React, { useEffect, useRef, useState } from 'react'

const Lexware = () => {
  const webviewRef = useRef<any>(null)
  const [credentials, setCredentials] = useState<{user: string, pass: string} | null>(null)
  const [loading, setLoading] = useState(true)
  
  // @ts-ignore - Prüfe direkt ob window.electron existiert (unabhängig von useRemote flag)
  const isElectron = typeof window !== 'undefined' && window.electron && typeof window.electron === 'object';

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        // Lade Credentials direkt via IPC wenn in Electron
        if (isElectron) {
          // @ts-ignore
          const settings = await window.electron.ipcRenderer.invoke('get-settings')
          if (settings && settings.lexwareUser && settings.lexwarePass) {
            setCredentials({ user: settings.lexwareUser, pass: settings.lexwarePass })
          }
        }
      } catch (err) {
        console.error('Failed to load credentials', err);
      } finally {
        setLoading(false)
      }
    }
    loadCredentials()
  }, [isElectron])

  useEffect(() => {
    if (!isElectron) return;

    const webview = webviewRef.current
    if (!webview || !credentials) return

    const handleDomReady = () => {
      // Inject login script
      const script = `
        (function() {
          const username = "${credentials.user}";
          const password = "${credentials.pass}";
          
          function setNativeValue(element, value) {
            const lastValue = element.value;
            element.value = value;
            const event = new Event('input', { bubbles: true });
            const tracker = element._valueTracker;
            if (tracker) {
              tracker.setValue(lastValue);
            }
            element.dispatchEvent(event);
          }

          function triggerEvents(element) {
            const events = ['input', 'change', 'blur', 'focus'];
            events.forEach(evt => {
              element.dispatchEvent(new Event(evt, { bubbles: true }));
            });
          }

          // Try to find login fields
          const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelector('input[name="username"]');
          const passwordInput = document.querySelector('input[type="password"]');
          const submitBtn = document.querySelector('button[type="submit"]');

          if (emailInput && passwordInput) {
             console.log('Found login fields, attempting auto-fill...');
             
             setNativeValue(emailInput, username);
             triggerEvents(emailInput);
             
             setNativeValue(passwordInput, password);
             triggerEvents(passwordInput);

             // Auto submit
             if (submitBtn) {
                console.log('Clicking submit...');
                setTimeout(() => {
                   submitBtn.click();
                }, 1000);
             }
          }
        })();
      `
      try {
        webview.executeJavaScript(script)
      } catch (e) {
        console.error("Failed to execute JS in webview", e);
      }
    }

    webview.addEventListener('dom-ready', handleDomReady)
    return () => {
        try {
            webview.removeEventListener('dom-ready', handleDomReady)
        } catch (e) {}
    }
  }, [credentials, isElectron])

  if (!isElectron) {
    return (
        <div className="h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center space-y-4">
            <h1 className="text-2xl font-bold">Lexware Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Die integrierte Ansicht ist nur in der Desktop-App verfügbar.</p>
            <button 
                onClick={() => window.open("https://app.lexware.de/dash", "_blank")}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                Im Browser öffnen
            </button>
        </div>
    )
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Lexware Dashboard</h1>
      <div className="flex-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm" style={{ minHeight: '500px' }}>
        <webview 
          ref={webviewRef}
          src="https://app.lexware.de/dash" 
          style={{ width: '100%', height: '100%', minHeight: '500px' }}
          // @ts-ignore
          allowpopups="true"
        />
      </div>
    </div>
  )
}

export default Lexware
