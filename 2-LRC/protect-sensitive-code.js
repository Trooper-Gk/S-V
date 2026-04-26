

// ============================================================
// SCP FOUNDATION - SENSITIVE CODE PROTECTION SCRIPT
// Protects: PLP-L-2, PLP-L-3, PLP-L-4, PLP-L-5
//           L-5T-Code-of-Ethics, L-5T-Lockdown-Response-Code
//           L-4-Lockdown-Response-Code, 3-LRC, 2-LRC
//           L-4-Code-of-Ethics, L3-CoE, L2-CoE, L-1-CoE
// ============================================================

(function() {
    'use strict';

    // ========== CONFIGURATION ==========
    // List of protected file/folder patterns (case-insensitive)
    const PROTECTED_PATTERNS = [
        /PLP-L-2/i,
        /PLP[-\s]?L[-\s]?3/i,
        /PLP[-\s]?L[-\s]?4/i,
        /PLP[-\s]?L[-\s]?5/i,
        /L-5T-Code-of-Ethics/i,
        /L-5T-Lockdown-Response-Code/i,
        /L-5T-Locdown-Response-Code/i,
        /L-4-Lockdown-Response-Code/i,
        /L-4-Locdown-Response-Code/i,
        /3-LRC/i,
        /2-LRC/i,
        /L-4-Code-of-Ethics/i,
        /L3-CoE/i,
        /L2-CoE/i,
        /L-1-CoE/i,
        /L[-\s]?1[-\s]?CoE/i,
        /L[-\s]?2[-\s]?CoE/i,
        /L[-\s]?3[-\s]?CoE/i,
        /L[-\s]?4[-\s]?Code[-\s]?of[-\s]?Ethics/i
    ];

    // Response messages for different clearance levels
    const REDACTED_MESSAGES = {
        'PLP-L-2': 'ACCESS DENIED - Clearance L-2 Insufficient for PLP Archive',
        'PLP-L-3': 'ACCESS DENIED - Clearance L-3 Required for PLP Archive',
        'PLP-L-4': 'ACCESS DENIED - Clearance L-4 Required for PLP Archive',
        'PLP-L-5': 'ACCESS DENIED - Clearance L-5 Required for PLP Archive',
        'L-5T': 'ACCESS DENIED - Thaumiel Clearance Required',
        'L-4': 'ACCESS DENIED - Level 4 Clearance Required',
        'L-3': 'ACCESS DENIED - Level 3 Clearance Required',
        'L-2': 'ACCESS DENIED - Level 2 Clearance Required',
        'L-1': 'ACCESS DENIED - Level 1 Clearance Required',
        'default': '█ ACCESS DENIED █ - This content is restricted to authorized personnel only. Violation will be logged and reported to the Ethics Committee.'
    };

    // Detect which protected pattern matches (if any)
    function detectProtectedContent(url, pageContent) {
        const haystack = (url + ' ' + (pageContent || '')).toLowerCase();
        for (const pattern of PROTECTED_PATTERNS) {
            if (pattern.test(haystack)) {
                if (/plp-l-2/i.test(haystack)) return 'PLP-L-2';
                if (/plp-l-3/i.test(haystack)) return 'PLP-L-3';
                if (/plp-l-4/i.test(haystack)) return 'PLP-L-4';
                if (/plp-l-5/i.test(haystack)) return 'PLP-L-5';
                if (/l-5t/i.test(haystack)) return 'L-5T';
                if (/l-4/i.test(haystack) && /lockdown|code of ethics/i.test(haystack)) return 'L-4';
                if (/l-3/i.test(haystack) || /3-lrc/i.test(haystack)) return 'L-3';
                if (/l-2/i.test(haystack) || /2-lrc/i.test(haystack)) return 'L-2';
                if (/l-1/i.test(haystack)) return 'L-1';
                return 'default';
            }
        }
        return null;
    }

    // ========== 1. PREVENT RIGHT-CLICK (Inspect Element) ==========
    document.addEventListener('contextmenu', function(e) {
        // Allow normal right-click on input/textarea for accessibility
        if (e.target.closest('input, textarea, [contenteditable="true"]')) {
            return true;
        }
        
        // Check if we're on protected content
        const url = window.location.href;
        const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
        const protectedMatch = detectProtectedContent(url, bodyText);
        
        if (protectedMatch) {
            e.preventDefault();
            showRedactionWarning(protectedMatch);
            return false;
        }
        
        // Still prevent inspect element on sensitive pages
        if (isSensitivePage()) {
            e.preventDefault();
            return false;
        }
        
        return true;
    });

    // ========== 2. PREVENT F12, CTRL+SHIFT+I, CTRL+SHIFT+J, CTRL+U ==========
    document.addEventListener('keydown', function(e) {
        // Check for protected content
        const url = window.location.href;
        const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
        const protectedMatch = detectProtectedContent(url, bodyText);
        
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            if (protectedMatch) showRedactionWarning(protectedMatch);
            else showGenericWarning();
            return false;
        }
        
        // CTRL+SHIFT+I (Inspect)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
            e.preventDefault();
            if (protectedMatch) showRedactionWarning(protectedMatch);
            else showGenericWarning();
            return false;
        }
        
        // CTRL+SHIFT+J (Console)
        if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
            e.preventDefault();
            if (protectedMatch) showRedactionWarning(protectedMatch);
            else showGenericWarning();
            return false;
        }
        
        // CTRL+U (View Source)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
            e.preventDefault();
            if (protectedMatch) showRedactionWarning(protectedMatch);
            else showGenericWarning();
            return false;
        }
        
        // CTRL+SHIFT+C (Inspect Element picker)
        if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
            if (protectedMatch) showRedactionWarning(protectedMatch);
            else showGenericWarning();
            return false;
        }
    });

    // ========== 3. DETECT DEVTOOLS OPENING ==========
    let devToolsOpen = false;
    const devToolsCheck = function() {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
            if (!devToolsOpen) {
                devToolsOpen = true;
                const url = window.location.href;
                const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
                const protectedMatch = detectProtectedContent(url, bodyText);
                
                if (protectedMatch) {
                    clearPageContent(protectedMatch);
                    showRedactionWarning(protectedMatch, true);
                } else if (isSensitivePage()) {
                    clearPageContent();

[]


// ========== 3. DETECT DEVTOOLS OPENING (continued) ==========
                    clearPageContent();
                    showGenericWarning(true);
                }
            }
        } else {
            devToolsOpen = false;
        }
    };
    
    // Check every second for DevTools
    setInterval(devToolsCheck, 1000);
    
    // Also check on resize
    window.addEventListener('resize', devToolsCheck);

    // ========== 4. OVERRIDE CONSOLE METHODS ==========
    // Prevent logging of sensitive data
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    const originalConsoleDebug = console.debug;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    console.log = function() {
        const args = Array.from(arguments).join(' ');
        if (isSensitiveString(args)) {
            return;
        }
        originalConsoleLog.apply(console, arguments);
    };
    
    console.info = function() {
        const args = Array.from(arguments).join(' ');
        if (isSensitiveString(args)) {
            return;
        }
        originalConsoleInfo.apply(console, arguments);
    };
    
    console.debug = function() {
        const args = Array.from(arguments).join(' ');
        if (isSensitiveString(args)) {
            return;
        }
        originalConsoleDebug.apply(console, arguments);
    };
    
    // Keep errors visible but redact sensitive content
    console.error = function() {
        const args = Array.from(arguments);
        const redactedArgs = args.map(arg => {
            if (typeof arg === 'string' && isSensitiveString(arg)) {
                return '[REDACTED - L-4 CLEARANCE REQUIRED]';
            }
            return arg;
        });
        originalConsoleError.apply(console, redactedArgs);
    };
    
    console.warn = function() {
        const args = Array.from(arguments);
        const redactedArgs = args.map(arg => {
            if (typeof arg === 'string' && isSensitiveString(arg)) {
                return '[REDACTED - L-4 CLEARANCE REQUIRED]';
            }
            return arg;
        });
        originalConsoleWarn.apply(console, redactedArgs);
    };
    
    // Disable console.trace for protected content
    console.trace = function() {
        if (isSensitivePage()) return;
        originalConsoleLog.apply(console, ['Trace unavailable for this content']);
    };
    
    // Disable console.table
    console.table = function() {
        if (isSensitivePage()) return;
        originalConsoleLog.apply(console, ['Table view unavailable for this content']);
    };

    // ========== 5. PREVENT SOURCE VIEWING VIA BLOB/DATA URLS ==========
    // Override open and fetch for sensitive content
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        const url = arguments[1];
        if (url && isSensitiveUrl(url)) {
            this._sensitive = true;
        }
        return originalOpen.apply(this, arguments);
    };
    
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        if (this._sensitive) {
            // Return empty response for sensitive requests
            Object.defineProperty(this, 'responseText', {
                get: function() { return '[ACCESS DENIED - Content Restricted]'; }
            });
            Object.defineProperty(this, 'response', {
                get: function() { return '[ACCESS DENIED - Content Restricted]'; }
            });
        }
        return originalSend.apply(this, arguments);
    };
    
    // Block fetch for sensitive URLs
    const originalFetch = window.fetch;
    window.fetch = function() {
        const url = arguments[0];
        if (url && isSensitiveUrl(url.toString())) {
            return Promise.reject(new Error('ACCESS DENIED - This resource is restricted'));
        }
        return originalFetch.apply(this, arguments);
    };

    // ========== 6. PREVENT DRAG-AND-DROP OF FILES ==========
    document.addEventListener('dragstart', function(e) {
        if (isSensitivePage()) {
            e.preventDefault();
            return false;
        }
    });
    
    document.addEventListener('drop', function(e) {
        if (isSensitivePage()) {
            e.preventDefault();
            return false;
        }
    });

    // ========== 7. BLOCK PRINTING ==========
    window.beforeprint = function() {
        if (isSensitivePage()) {
            alert('Printing restricted documents is prohibited per Code of Ethics Section 8, Article 3.');
            return false;
        }
    };
    
    // Override print
    const originalPrint = window.print;
    window.print = function() {
        if (isSensitivePage()) {
            alert('Printing restricted documents is prohibited. This incident will be reported.');
            return;
        }
        originalPrint();
    };

    // ========== 8. PREVENT SCREEN CAPTURE DETECTION WORKAROUNDS ==========
    // Disable media request for screen capture triggers
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = function() {
            if (isSensitivePage()) {
                return Promise.reject(new Error('Screen capture is not permitted while viewing restricted content'));
            }
            return originalGetDisplayMedia.apply(this, arguments);
        };
    }

    // ========== 9. INTERCEPT AND REDACT ELEMENT ATTRIBUTES ==========
    // MutationObserver to redact sensitive data from the DOM
    const redactSensitiveElements = function() {
        const sensitiveSelectors = [
            'code', 'pre', '.article-code', '.classified', 
            '.redacted-crimson', '.redacted-purple', '.redacted-dark-green',
            '[data-sensitive="true"]'
        ];
        
        sensitiveSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (!el.hasAttribute('data-redacted')) {
                    const originalText = el.innerText;
                    if (isSensitiveString(originalText)) {
                        el.setAttribute('data-original', 'hidden');
                        el.setAttribute('data-redacted', 'true');
                        el.style.backgroundColor = '#000';
                        el.style.color = '#000';
                        el.innerText = '████████████';
                    }
                }
            });
        });
    };
    
    // Run on page load and when DOM changes
    const observer = new MutationObserver(function() {
        if (isSensitivePage()) {
            redactSensitiveElements();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial redaction
    if (document.body) {
        redactSensitiveElements();
    }

    // ========== 10. HELPER FUNCTIONS ==========
    function isSensitivePage() {
        const url = window.location.href;
        const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
        return detectProtectedContent(url, bodyText) !== null;
    }
    
    function isSensitiveUrl(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        for (const pattern of PROTECTED_PATTERNS) {
            if (pattern.test(lowerUrl)) {
                return true;
            }
        }
        return false;
    }
    
    function isSensitiveString(str) {
        if (!str) return false;
        const lowerStr = str.toLowerCase();
        for (const pattern of PROTECTED_PATTERNS) {
            if (pattern.test(lowerStr)) {
                return true;
            }
        }
        // Also check for key phrases
        const sensitivePhrases = [
            'code of ethics', 'lockdown response', 'plp-l', 'o5 council', 
            'administrator', 'omega-1', 'alpha-1', 'resh-1'
        ];
        for (const phrase of sensitivePhrases) {
            if (lowerStr.includes(phrase)) {
                return true;
            }
        }
        return false;
    }
    
    function clearPageContent(level) {
        if (!document.body) return;
        // Hide all content and show redaction message
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = `
            <div style="background-color:#1a1a1a;color:#b01c1c;font-family:'Courier New',monospace;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;flex-direction:column;">
                <h1>⚠️ ACCESS VIOLATION DETECTED ⚠️</h1>
                <div style="border:2px solid #b01c1c;padding:30px;margin:20px;max-width:600px;">
                    <p style="color:#ff6b6b;font-size:18px;">${REDACTED_MESSAGES[level] || REDACTED_MESSAGES.default}</p>
                    <p style="color:#aaaaaa;margin-top:20px;">Your attempt to access restricted content has been logged.</p>
                    <p style="color:#666;font-size:12px;margin-top:30px;">Reference: ${generateReferenceNumber()}</p>
                </div>
            </div>
        `;
        // Prevent further interaction
        document.body.style.userSelect = 'none';
        document.body.style.overflow = 'hidden';
    }
    
    function showRedactionWarning(level, isPermanent = false) {
        const message = REDACTED_MESSAGES[level] || REDACTED_MESSAGES.default;
        if (isPermanent) {
            clearPageContent(level);
        } else {
            // Create temporary warning
            const warning = document.createElement('div');
            warning.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0;
                background-color: #8b0000; color: white;
                text-align: center; padding: 15px;
                z-index: 99999; font-family: monospace;
                font-weight: bold; border-bottom: 2px solid #dc143c;
                animation: slideDown 0.3s ease-out;
            `;
            warning.innerText = message;
            document.body.prepend(warning);
            setTimeout(() => warning.remove(), 3000);
        }
        
        // Log to internal security (silent)
        logSecurityViolation(level);
    }
    
    function showGenericWarning(isPermanent = false) {
        if (isPermanent && isSensitivePage()) {
            clearPageContent('default');
        } else {
            const warning = document.createElement('div');
            warning.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0;
                background-color: #8b0000; color: white;
                text-align: center; padding: 15px;
                z-index: 99999; font-family: monospace;
                font-weight: bold;
            `;
            warning.innerText = '█ RESTRICTED CONTENT █ Developer tools are disabled for this document per Ethics Committee directive.';
            document.body.prepend(warning);
            setTimeout(() => warning.remove(), 3000);
        }
    }
    
    function generateReferenceNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `EC-${timestamp}-${random}`;
    }
    
    function logSecurityViolation(level) {
        // Silent logging to console (if not blocked)
        const violation = {
            timestamp: new Date().toISOString(),
            level: level || 'UNKNOWN',
            url: window.location.href,
            userAgent: navigator.userAgent,
            reference: generateReferenceNumber()
        };
        
        // Attempt to send to server (optional - uncomment if you have an endpoint)
        /*
        fetch('/api/security-violation', {
            method: 'POST',
            body: JSON.stringify(violation),
            headers: { 'Content-Type': 'application/json' }
        }).catch(e => {});
        */
        
        // Store in sessionStorage for internal audit
        try {
            const violations = JSON.parse(sessionStorage.getItem('ec_security_violations') || '[]');
            violations.push(violation);
            sessionStorage.setItem('ec_security_violations', JSON.stringify(violations.slice(-20)));
        } catch(e) {}
    }
    
    // ========== 11. ADD CSS FOR ANIMATIONS ==========
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .redaction-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 99998;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #b01c1c;
            font-family: monospace;
            font-size: 24px;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
    
    // ========== 12. FINAL CLEANUP ==========
    // Remove any existing console shortcuts
    window.__console = undefined;
    window.__devtools = undefined;
    
    // Prevent redefinition
    Object.freeze(console);
    
    console.log('SCP Foundation Security Protocol Active - Code of Ethics Enforcement v2.6');
})();
