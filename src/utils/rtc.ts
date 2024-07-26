export function getUFragFromSdp(sdp?: string) {
    const entry = sdp?.split('\r\n').find(r => r.startsWith("a=ice-ufrag:"))

    if (!entry) return "";

    return entry.replace("a=ice-ufrag:", "").trim();
}