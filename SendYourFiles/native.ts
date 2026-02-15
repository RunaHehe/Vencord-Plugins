import { net } from "electron";
import type { IpcMainInvokeEvent } from "electron";

export async function uploadFileNative(
    event: IpcMainInvokeEvent,
    url: string,
    fileName: string,
    fileData: Uint8Array,
    contentType: string,
    method: "POST" | "PUT" = "POST",
    extraHeaders: Record<string, string> = {}
): Promise<{ status: number; data: string }> {

    console.log("[Native] Raw URL:", url);

    if (!url || typeof url !== "string") {
        throw new Error("uploadFileNative received invalid URL: " + String(url));
    }

    let parsedUrl: string;

    try {
        parsedUrl = new URL(url.trim()).toString();
    } catch (err) {
        console.error("URL parsing failed:", url);
        throw err;
    }

    console.log("[Native] Parsed URL:", parsedUrl);

    return new Promise((resolve, reject) => {
        const request = net.request({
            method,
            url: parsedUrl,
            headers: {
                "Content-Type": contentType,
                ...extraHeaders,
            },
        });

        request.on("response", (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve({ status: res.statusCode, data }));
        });

        request.on("error", reject);

        request.write(Buffer.from(fileData));
        request.end();
    });
}
