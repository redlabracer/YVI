import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'

const Conrad = () => {
  const webviewRef = useRef<any>(null)
  const [credentials, setCredentials] = useState<{user: string, pass: string} | null>(null)
  
  // @ts-ignore
  const isElectron = window.electron && typeof window.electron === 'object';

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const settings = await api.settings.get()
        if (settings && settings.carPartsUser && settings.carPartsPass) {
          setCredentials({ user: settings.carPartsUser, pass: settings.carPartsPass })
        }
      } catch (err) {
        console.error('Failed to load credentials', err);
      }
    }
    loadCredentials()
  }, [])

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
          
          // Helper to force value update for React/Angular/Vue
          function setNativeValue(element, value) {
            const lastValue = element.value;
            element.value = value;
            const event = new Event('input', { bubbles: true });
            // Hack for React 15/16
            const tracker = element._valueTracker;
            if (tracker) {
              tracker.setValue(lastValue);
            }
            element.dispatchEvent(event);
          }

          function triggerEvents(element) {
            const events = ['input', 'change', 'blur', 'focus', 'keydown', 'keyup', 'keypress'];
            events.forEach(evt => {
              element.dispatchEvent(new Event(evt, { bubbles: true }));
            });
          }

          function tryLogin() {
            // 1. Check for Username field (Step 1 or Combined)
            const userInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), input[type="email"]'));
            const userInput = userInputs.find(i => 
              (i.placeholder && i.placeholder.toLowerCase().includes('benutzer')) || 
              (i.name && i.name.toLowerCase().includes('user')) ||
              (i.id && i.id.toLowerCase().includes('user')) ||
              (i.type === 'email')
            );

            // 2. Check for Password field
            const passInput = document.querySelector('input[type="password"]');

            if (username && userInput && userInput.value !== username) {
              setNativeValue(userInput, username);
              triggerEvents(userInput);
            }

            if (password && passInput && passInput.value !== password) {
              setNativeValue(passInput, password);
              triggerEvents(passInput);
            }

            // 3. Click Button
            if ((username && userInput) || (password && passInput)) {
              const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
              const actionBtn = buttons.find(b => {
                const text = (b.innerText || b.value || '').toLowerCase();
                return text.includes('weiter') || text.includes('login') || text.includes('anmelden');
              });

              if (actionBtn) {
                setTimeout(() => actionBtn.click(), 500);
              }
            }
          }

          // Run logic with retries
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            
            // Check if we are on login page
            const isLoginPage = document.querySelector('input[type="password"]') || 
                                Array.from(document.querySelectorAll('input')).some(i => i.placeholder && i.placeholder.toLowerCase().includes('benutzer'));

            if (isLoginPage || attempts < 5) {
              tryLogin();
              // Don't clear interval immediately, as it might be a multi-step login
              if (attempts > 20) clearInterval(interval); 
            } else {
               // Stop if not on login page (meaning we are logged in)
               clearInterval(interval);
            }
          }, 1000);
        })();
      `
      try {
        webview.executeJavaScript(script)
      } catch (e) {
        console.error("webview script err", e)
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
        <div className="h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center space-y-4 px-4">
            <h1 className="text-2xl font-bold text-center dark:text-white">Conrad (Carparts)</h1>
            <p className="text-gray-600 dark:text-gray-400 text-center">Die integrierte Ansicht ist nur in der Desktop-App verfügbar.</p>
            <button 
                onClick={() => window.open("https://tm1.carparts-cat.com/login/car", "_blank")}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                Im Browser öffnen
            </button>
        </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Conrad (Carparts)</h1>
      <div className="flex-1 bg-white border rounded-lg overflow-hidden shadow-sm">
        <webview 
          ref={webviewRef}
          src="https://tm1.carparts-cat.com/login/car" 
          style={{ width: '100%', height: '100%', display: 'inline-flex' }}
          allowpopups="true"
        />
      </div>
    </div>
  )
}

export default Conrad
