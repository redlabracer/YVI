import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react'

const Lexware = () => {
  const webviewRef = useRef<any>(null)
  const [credentials, setCredentials] = useState<{user: string, pass: string} | null>(null)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  
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
          // Guard: only run the auto-login routine once per page load to avoid
          // repeatedly re-filling / re-submitting (which could lock the account).
          if (window.__lxAutoLoginRan) return;
          window.__lxAutoLoginRan = true;

          const username = ${JSON.stringify(credentials.user)};
          const password = ${JSON.stringify(credentials.pass)};

          // Proper React (incl. React 18 / MUI) native value setter so the
          // controlled <input> components actually register the typed value.
          function setNativeValue(element, value) {
            const proto = Object.getPrototypeOf(element);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            const protoSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (setter && setter !== protoSetter) {
              protoSetter.call(element, value);
            } else if (setter) {
              setter.call(element, value);
            } else {
              element.value = value;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }

          function isVisible(el) {
            return el && el.offsetParent !== null;
          }

          let attempts = 0;
          let submitted = false;
          const interval = setInterval(() => {
            attempts++;
            // Lexware shows an AWS WAF challenge + Usercentrics consent banner,
            // which can delay the React form. Poll generously (~60s).
            if (attempts > 120 || submitted) {
              clearInterval(interval);
              return;
            }

            // The Lexware login form (MUI) uses:
            //   email:    <input type="text" name="username" aria-label="username">
            //   password: <input type="password" name="password" aria-label="password">
            //   submit:   <button type="submit">ANMELDEN</button>
            const emailInput =
              document.querySelector('input[name="username"]') ||
              document.querySelector('input[aria-label="username"]') ||
              document.querySelector('input[type="email"]') ||
              document.querySelector('input[name="email"]');
            const passwordInput =
              document.querySelector('input[name="password"]') ||
              document.querySelector('input[aria-label="password"]') ||
              document.querySelector('input[type="password"]');

            if (!isVisible(emailInput) || !isVisible(passwordInput)) {
              return; // form not ready yet (WAF/consent still loading)
            }

            console.log('Lexware AutoLogin: found login fields, filling...');

            emailInput.focus();
            setNativeValue(emailInput, username);
            emailInput.blur();

            setTimeout(() => {
              passwordInput.focus();
              setNativeValue(passwordInput, password);
              passwordInput.blur();

              setTimeout(() => {
                // Re-query the submit button now that fields are filled (MUI may
                // toggle its disabled state once the form is valid).
                let submitBtn = document.querySelector('button[type="submit"]');
                if (!submitBtn) {
                  submitBtn = Array.from(document.querySelectorAll('button'))
                    .find(b => isVisible(b) && (b.innerText || '').trim().toLowerCase().includes('anmelden'));
                }
                if (submitBtn && !submitBtn.disabled) {
                  console.log('Lexware AutoLogin: submitting...');
                  submitted = true;
                  clearInterval(interval);
                  submitBtn.click();
                }
              }, 400);
            }, 250);
          }, 500);
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

  // Track navigation state so the back/forward buttons reflect history.
  useEffect(() => {
    if (!isElectron) return
    const webview = webviewRef.current
    if (!webview) return

    const updateNavState = () => {
      try {
        setCanGoBack(webview.canGoBack())
        setCanGoForward(webview.canGoForward())
      } catch (e) {
        /* webview not ready yet */
      }
    }

    webview.addEventListener('did-navigate', updateNavState)
    webview.addEventListener('did-navigate-in-page', updateNavState)
    webview.addEventListener('dom-ready', updateNavState)
    return () => {
      try {
        webview.removeEventListener('did-navigate', updateNavState)
        webview.removeEventListener('did-navigate-in-page', updateNavState)
        webview.removeEventListener('dom-ready', updateNavState)
      } catch (e) {}
    }
  }, [isElectron, loading])

  const handleBack = () => {
    const webview = webviewRef.current
    if (webview && webview.canGoBack()) webview.goBack()
  }

  const handleForward = () => {
    const webview = webviewRef.current
    if (webview && webview.canGoForward()) webview.goForward()
  }

  const handleReload = () => {
    const webview = webviewRef.current
    if (webview) webview.reload()
  }

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
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold mr-2">Lexware Dashboard</h1>
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          title="Zurück"
          className="p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={handleForward}
          disabled={!canGoForward}
          title="Vorwärts"
          className="p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ArrowRight size={18} />
        </button>
        <button
          onClick={handleReload}
          title="Neu laden"
          className="p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <RotateCw size={18} />
        </button>
      </div>
      <div className="flex-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm" style={{ minHeight: '500px' }}>
        <webview 
          ref={webviewRef}
          src="https://app.lexware.de/dash" 
          style={{ width: '100%', height: '100%', minHeight: '500px' }}
          // @ts-ignore
          partition="persist:lexware"
          // @ts-ignore
          allowpopups="true"
        />
      </div>
    </div>
  )
}

export default Lexware
