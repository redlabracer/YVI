import React, { useEffect, useRef, useState } from 'react'

const Lexware = () => {
  const webviewRef = useRef<any>(null)
  const [credentials, setCredentials] = useState<{user: string, pass: string} | null>(null)

  useEffect(() => {
    const loadCredentials = async () => {
      // @ts-ignore
      const settings = await window.electron.ipcRenderer.invoke('get-settings')
      if (settings && settings.lexwareUser && settings.lexwarePass) {
        setCredentials({ user: settings.lexwareUser, pass: settings.lexwarePass })
      }
    }
    loadCredentials()
  }, [])

  useEffect(() => {
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
      webview.executeJavaScript(script)
    }

    webview.addEventListener('dom-ready', handleDomReady)
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
    }
  }, [credentials])

  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Lexware Dashboard</h1>
      <div className="flex-1 bg-white border rounded-lg overflow-hidden shadow-sm">
        <webview 
          ref={webviewRef}
          src="https://app.lexware.de/dash" 
          style={{ width: '100%', height: '100%', display: 'inline-flex' }}
          allowpopups="true"
        />
      </div>
    </div>
  )
}

export default Lexware
