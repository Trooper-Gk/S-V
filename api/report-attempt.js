export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const reportData = req.body;
        const { username, password, timestamp, ip, deviceInfo, locationData, plpInfo } = reportData;
        
        // Get the Discord webhook URL from environment variables
        const webhookURL = process.env.isdreport;
        
        if (!webhookURL) {
            console.error('ISD report webhook URL not configured');
            return res.status(500).json({ error: 'Reporting service not configured' });
        }

        // Create Discord timestamp (Unix timestamp)
        const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);
        const discordTimestamp = `<t:${unixTimestamp}:F>`;
        const discordRelativeTime = `<t:${unixTimestamp}:R>`;

        // Build the Discord embed
        const discordMessage = {
            embeds: [{
                title: '🚨 **SECURITY INCIDENT REPORT - I.S.D. ALERT** 🚨',
                color: 0xFF0000,
                description: '**Unauthorized access attempt detected and logged**',
                fields: [
                    // PLP Information - This is the new section at the top
                    {
                        name: '🔐 **LOGIN PAGE INFORMATION**',
                        value: `\`\`\`yaml
PLP: ${plpInfo?.name || 'Unknown'}
Clearance Level: ${plpInfo?.clearance || 'Unknown'} (Level ${plpInfo?.level || '?'})
Description: ${plpInfo?.description || 'Unknown'}
Page URL: ${plpInfo?.url || 'Unknown'}
Page Path: ${plpInfo?.path || 'Unknown'}\`\`\``,
                        inline: false
                    },
                    
                    // Credentials attempted
                    {
                        name: '🔑 **CREDENTIALS ATTEMPTED**',
                        value: `\`\`\`Username: ${username || 'Not provided'}\nPassword: ${password || 'Not provided'}\`\`\``,
                        inline: false
                    },
                    
                    // IP Information
                    {
                        name: '🌐 **IP ADDRESS**',
                        value: `\`${ip || 'Unknown'}\``,
                        inline: true
                    },
                    {
                        name: '📡 **IP REPUTATION**',
                        value: '⚠️ **SUSPICIOUS**',
                        inline: true
                    },
                    
                    // Timestamp
                    {
                        name: '⏰ **TIMESTAMP**',
                        value: `${discordTimestamp}\n${discordRelativeTime}`,
                        inline: false
                    },
                    
                    // Location data from multiple vendors
                    {
                        name: '🗺️ **GEOLOCATION DATA (5 VENDORS)**',
                        value: formatLocationData(locationData),
                        inline: false
                    },
                    
                    // Timezone Information
                    {
                        name: '🕐 **TIMEZONE INFORMATION**',
                        value: `\`\`\`Timezone: ${deviceInfo?.timezone || 'Unknown'}\nOffset: ${deviceInfo?.timezoneOffset || 'Unknown'} minutes\nLocal Time: ${deviceInfo?.localTime || 'Unknown'}\`\`\``,
                        inline: false
                    },
                    
                    // Device Information
                    {
                        name: '💻 **DEVICE INFORMATION**',
                        value: formatDeviceInfo(deviceInfo),
                        inline: false
                    },
                    
                    // Browser/OS Information
                    {
                        name: '🌍 **BROWSER & OS**',
                        value: `\`\`\`Browser: ${deviceInfo?.browserName || 'Unknown'} ${deviceInfo?.browserVersion || ''}\nOS: ${deviceInfo?.osName || 'Unknown'}\nPlatform: ${deviceInfo?.platform || 'Unknown'}\nLanguage: ${deviceInfo?.language || 'Unknown'}\`\`\``,
                        inline: false
                    },
                    
                    // Screen/Display
                    {
                        name: '🖥️ **DISPLAY INFORMATION**',
                        value: `\`\`\`Resolution: ${deviceInfo?.screenResolution || 'Unknown'}\nColor Depth: ${deviceInfo?.screenColorDepth || 'Unknown'}\nWindow Size: ${deviceInfo?.windowSize || 'Unknown'}\`\`\``,
                        inline: false
                    },
                    
                    // Fingerprinting
                    {
                        name: '🔍 **FINGERPRINTING DATA**',
                        value: `\`\`\`Device ID: ${deviceInfo?.deviceId || 'Unknown'}\nWebGL Vendor: ${deviceInfo?.webglVendor || 'Unknown'}\nCanvas FP: ${deviceInfo?.canvasFingerprint || 'Unknown'}\nAudio FP: ${deviceInfo?.audioFingerprint || 'Unknown'}\`\`\``,
                        inline: false
                    },
                    
                    // Connection Information
                    {
                        name: '📶 **CONNECTION INFORMATION**',
                        value: `\`\`\`Type: ${deviceInfo?.connectionType || 'Unknown'}\nSpeed: ${deviceInfo?.connectionSpeed || 'Unknown'} Mbps\nHardware Cores: ${deviceInfo?.hardwareConcurrency || 'Unknown'}\nDevice Memory: ${deviceInfo?.deviceMemory || 'Unknown'} GB\`\`\``,
                        inline: false
                    },
                    
                    // Additional Data
                    {
                        name: '🔎 **ADDITIONAL IDENTIFIERS**',
                        value: `\`\`\`Referrer: ${deviceInfo?.referrer || 'Unknown'}\nPlugins: ${deviceInfo?.plugins || 'None'}\nCookies Enabled: ${deviceInfo?.cookieEnabled ? 'Yes' : 'No'}\nLocal Storage: ${deviceInfo?.localStorageAvailable ? 'Yes' : 'No'}\`\`\``,
                        inline: false
                    },
                    
                    // Risk Assessment
                    {
                        name: '⚠️ **RISK ASSESSMENT**',
                        value: '```diff\n- HIGH - Unauthorized Access Attempt\n- Credentials did not match any known personnel\n- Report has been logged to I.S.D. database\n- R.A.I.S.A. has been notified\n```',
                        inline: false
                    }
                ],
                footer: {
                    text: `SCP Foundation - Internal Security Department | ${plpInfo?.name || 'PLP'} | Level ${plpInfo?.level || '?'} Clearance`,
                    icon_url: 'https://cdn.discordapp.com/attachments/1445156366917439529/1456277684454948894/output-onlinepngtools_upscayl_4x_realesrgan-x4plus-anime.png'
                },
                timestamp: new Date().toISOString(),
                thumbnail: {
                    url: 'https://cdn.discordapp.com/attachments/1445156366917439529/1456277684454948894/output-onlinepngtools_upscayl_4x_realesrgan-x4plus-anime.png'
                },
                author: {
                    name: 'I.S.D. Automated Security System',
                    icon_url: 'https://cdn.discordapp.com/attachments/1445156366917439529/1456277684454948894/output-onlinepngtools_upscayl_4x_realesrgan-x4plus-anime.png'
                }
            }],
            username: 'SCP Foundation - I.S.D. Monitor',
            avatar_url: 'https://cdn.discordapp.com/attachments/1445156366917439529/1456277684454948894/output-onlinepngtools_upscayl_4x_realesrgan-x4plus-anime.png'
        };

        // Add a follow-up embed if there's a location match
        if (locationData) {
            const locationSummary = getLocationSummary(locationData);
            if (locationSummary) {
                discordMessage.embeds.push({
                    title: '📍 **LOCATION MATCH SUMMARY**',
                    color: 0xFF6600,
                    description: locationSummary,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Send the report to Discord
        const response = await fetch(webhookURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(discordMessage)
        });

        if (!response.ok) {
            throw new Error(`Discord API returned ${response.status}`);
        }

        res.status(200).json({ success: true, message: 'Incident reported to I.S.D.' });
    } catch (error) {
        console.error('Error reporting to ISD:', error);
        res.status(500).json({ error: 'Failed to report incident' });
    }
}

// Helper function to format location data
function formatLocationData(locationData) {
    if (!locationData) return 'No location data available';
    
    let formatted = '';
    for (const [vendor, data] of Object.entries(locationData)) {
        if (data.error) {
            formatted += `**${vendor}**: ❌ Failed to fetch\n`;
        } else {
            formatted += `**${vendor}**:\n`;
            formatted += `  📍 ${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country || 'Unknown'}\n`;
            formatted += `  📌 ${data.latitude || 'Unknown'}, ${data.longitude || 'Unknown'}\n`;
            formatted += `  🏢 ${data.isp || 'Unknown'}\n`;
            formatted += `  🔢 ${data.asn || 'Unknown'}\n`;
            formatted += `  🕐 ${data.timezone || 'Unknown'}\n\n`;
        }
    }
    return formatted || 'No location data available';
}

// Helper function to format device information
function formatDeviceInfo(deviceInfo) {
    if (!deviceInfo) return 'No device information available';
    
    return `\`\`\`yaml
Device ID: ${deviceInfo.deviceId || 'Unknown'}
User Agent: ${deviceInfo.userAgent || 'Unknown'}
Platform: ${deviceInfo.platform || 'Unknown'}
Language: ${deviceInfo.language || 'Unknown'}
Hardware Concurrency: ${deviceInfo.hardwareConcurrency || 'Unknown'}
Device Memory: ${deviceInfo.deviceMemory || 'Unknown'} GB
Max Touch Points: ${deviceInfo.maxTouchPoints || '0'}
Cookie Enabled: ${deviceInfo.cookieEnabled ? 'Yes' : 'No'}
Do Not Track: ${deviceInfo.doNotTrack || 'Not set'}\`\`\``;
}

// Helper function to get location summary
function getLocationSummary(locationData) {
    if (!locationData) return null;
    
    const vendors = ['ipapi.co', 'ip-api.com', 'ipinfo.io'];
    const matches = [];
    
    for (const vendor of vendors) {
        if (locationData[vendor] && !locationData[vendor].error) {
            const data = locationData[vendor];
            const location = `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country || 'Unknown'}`;
            if (!matches.includes(location)) {
                matches.push(location);
            }
        }
    }
    
    if (matches.length === 0) return null;
    
    const majority = matches[0];
    const confidence = Math.round((matches.filter(m => m === majority).length / vendors.length) * 100);
    
    return `**Location Consensus**: ${majority}\n**Confidence Level**: ${confidence}% based on ${vendors.length} vendors\n**Match Status**: ${confidence > 70 ? '✅ Strong Match' : '⚠️ Low Confidence'}`;
}
