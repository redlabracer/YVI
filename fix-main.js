const fs = require('fs');

function updateFile(filePath, isConrad) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let regex = /(function tryLogin\(\) \{[\s\S]*?\n\s*\}\)\(\);)/m;
  let newBlock = `function tryLogin() {
            const passInput = document.querySelector('input[type="password"]');
            if (!passInput || passInput.offsetParent === null) return false;

            const allInputs = Array.from(document.querySelectorAll('input'));
            let userInput = allInputs.find(i => {
              if (i.offsetParent === null) return false;
              const attrs = (i.name + i.id + i.placeholder + i.className + (i.type || '')).toLowerCase();
              return (i.type === 'text' || i.type === 'email' || !i.type) && (attrs.includes('user') || attrs.includes('email') || attrs.includes('login') || attrs.includes('benutzer'));
            });

            if (username && userInput && userInput.value !== username) {
              setNativeValue(userInput, username);
              triggerEvents(userInput);
            }

            if (password && passInput && passInput.value !== password) {
              setNativeValue(passInput, password);
              triggerEvents(passInput);
            }

            if ((username && userInput) || (password && passInput)) {
              const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [type="submit"], .btn, .button'));
              const actionBtn = buttons.find(b => {
                if (b.offsetParent === null) return false;
                const text = (b.innerText || b.textContent || b.value || '').toLowerCase();
                const attrs = (b.className || '').toLowerCase();
                return text.includes('weiter') || text.includes('login') || text.includes('anmelden') || text.includes('einloggen') || text.includes('submit') || attrs.includes('submit') || attrs.includes('login');
              });

              const fallbackBtn = actionBtn || buttons.find(b => b.offsetParent !== null && (b.type === 'submit' || b.tagName.toLowerCase() === 'button'));

              if (fallbackBtn) {
                setTimeout(() => fallbackBtn.click(), 500);
              }
            }
            return true;
          }`;

if (!isConrad) {
newBlock += `

          function trySearch() {
            const passInput = document.querySelector('input[type="password"]');
            if (passInput && passInput.offsetParent !== null) return false;

            const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
            
            let targetInput = inputs.find(i => {
              if (i.offsetParent === null) return false;
              const ph = (i.placeholder || '').toLowerCase();
              return ph.includes('golf') || ph.includes('kba') || ph.includes('0588') || ph.includes('chassis') || ph.includes('fin') || ph.includes('vin');
            });

            if (!targetInput) {
              targetInput = inputs.find(i => {
                if (i.offsetParent === null) return false;
                const text = (i.name + i.id + i.placeholder).toLowerCase();
                return text.includes('vin') || text.includes('fin') || text.includes('chassis');
              });
            }

            if (!targetInput) {
              targetInput = inputs.find(i => {
                if (i.offsetParent === null) return false;
                const text = (i.name + i.id + i.placeholder).toLowerCase();
                return text.includes('search') || text.includes('suche');
              });
            }

            if (targetInput && query) {
              if (targetInput.value === query) return true; // already filled
              targetInput.focus();
              setNativeValue(targetInput, query);
              triggerEvents(targetInput);

              const enterEvent = { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true };
              targetInput.dispatchEvent(new KeyboardEvent('keydown', enterEvent));
              targetInput.dispatchEvent(new KeyboardEvent('keypress', enterEvent));
              targetInput.dispatchEvent(new KeyboardEvent('keyup', enterEvent));

              let searchBtn = targetInput.parentElement?.querySelector('button, [role="button"], .icon-search, i.fa-search');
              
              if (!searchBtn) {
                searchBtn = document.querySelector('button[type="submit"], .search-button, button[aria-label*="such"], button[aria-label*="search"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('suchen') && b.offsetParent !== null);
              }

              if (searchBtn) {
                setTimeout(() => searchBtn.click(), 500);
              }
              return true;
            }
            return false;
          }

          let attempts = 0;
          let searchAttempts = 0;
          const interval = setInterval(() => {
            attempts++;
            
            const passInput = document.querySelector('input[type="password"]');
            const isLoginPage = passInput && passInput.offsetParent !== null;

            if (isLoginPage) {
              tryLogin();
              if (attempts > 20) clearInterval(interval);
            } else {
              searchAttempts++;
              if (trySearch() || searchAttempts > 15) {
                clearInterval(interval);
              }
            }
          }, 800);
        })();`;
} else {
    newBlock += `

          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            const passInput = document.querySelector('input[type="password"]');
            const isLoginPage = passInput && passInput.offsetParent !== null;

            if (isLoginPage) {
              tryLogin();
              if (attempts > 20) clearInterval(interval);
            } else if (attempts > 5) {
              clearInterval(interval);
            }
          }, 1000);
        })();`;
}

  if (content.match(regex)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync(filePath, content);
    console.log('Replaced in ' + filePath);
  } else {
    console.log('Failed to match in ' + filePath);
  }
}

updateFile('src/main/index.ts', false);
updateFile('src/renderer/src/pages/Conrad.tsx', true);
