import { net } from "electron"; // This entire thing either needs to be re-done or removed entirely

export async function uploadFileNative(
    url: string,
    fileName: string,
    fileData: Uint8Array,
    contentType: string,
    method: "POST" | "PUT" = "POST",
    extraHeaders: Record<string, string> = {}
): Promise<{ status: number; data: string }> {
    return new Promise((resolve, reject) => {
        try {
            const request = net.request({
                method,
                url,
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

            request.on("error", (err) => reject(err));

            request.write(fileData);
            request.end();
        } catch (err) {
            reject(err);
        }
    });
}

