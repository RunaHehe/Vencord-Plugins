import definePlugin from "@utils/types";
import { settings } from "./settings";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { openModal, ModalRoot, ModalFooter, ModalHeader, ModalContent, ModalProps } from "@utils/modal";
import { Button, Menu, React, useState } from "@webpack/common";
import { Heading } from "@components/Heading";
import { chooseFile } from "@utils/web";
import { ImageIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
type FileHost = "buzzheavier" | "catbox" | "litterbox";

const ctxMenuPatch: NavContextMenuPatchCallback = (children) => {
    children.push(
        <Menu.MenuItem
            id="send-large-file"
            iconLeft={ImageIcon}
            leadingAccessory={{
                type: "icon",
                icon: ImageIcon
            }}
            label="Upload Large Files"
            action={() => openModal(modalProps => <UploadModal modalProps={modalProps} />)}
        />
    );
};

export default definePlugin({
    name: "SendYourFiles",
    description: "Send your files above 10mb to BuzzHeavier, Catbox, Litterbox! (Inspired by shipwr3ckd)",
    authors: [{ name: "daveberrys", id: 1149685116042485781n}, { name: "runa.rune.", id: 1087521357849428020n}],
    settings,
    contextMenus: {
        "channel-attach": ctxMenuPatch
    }
});

// All the file hosting that supports sending files
const buzzHeavierAPI = "https://w.buzzheavier.com";
const catboxAPI = "https://catbox.moe/user/api.php";
const litterboxAPI = "https://litterbox.catbox.moe/resources/internals/api.php";

const CATBOX_USERHASH = "";
const DISCORD_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10 MB


export async function sendToFileHost(file: File): Promise<{ external: boolean; url?: string }> {
    if (file.size <= DISCORD_UPLOAD_LIMIT) {
        console.log("[Upload] File under Discord limit, using Discord directly.");
        return { external: false };
    }

    const host: FileHost = settings.store.fileProvider as FileHost;
    console.log("[Upload] Selected host:", host);

    if (exceedsHostLimit(file, host)) {
        throw new Error(`[Upload] File too large for ${host}`);
    }

    switch (host) {
        case "buzzheavier":
            return { external: true, url: await uploadToBuzzHeavier(file) };
        case "catbox":
            return { external: true, url: await uploadToCatbox(file) };
        case "litterbox":
            return { external: true, url: await uploadToLitterbox(file) };
        default:
            throw new Error(`[Upload] Unknown file host: ${host}`);
    }
}

function exceedsDiscordLimit(file: File) {
    return file.size > DISCORD_UPLOAD_LIMIT;
}

function exceedsHostLimit(file: File, host: FileHost) {
    switch (host) {
        case "catbox": return file.size > 200 * 1024 * 1024;
        case "litterbox": return file.size > 1024 * 1024 * 1024;
        case "buzzheavier": return false; // no limit
    }
}

async function uploadToBuzzHeavier(file: File): Promise<string> {
    const safeName = encodeURIComponent(file.name || "upload.bin");
    const uploadUrl = `${buzzHeavierAPI}/${safeName}`;

    console.log("[BuzzHeavier] Uploading to:", uploadUrl);

    const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" }
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[BuzzHeavier] Upload failed: ${text}`);
    }

    // BuzzHeavier returns JSON, so we need to parse it
    const json = await res.json();
    if (!json.data?.id) throw new Error("[BuzzHeavier] Invalid response JSON");

    return `https://buzzheavier.com/${json.data.id}`;
}

async function uploadToCatbox(file: File): Promise<string> {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    if (CATBOX_USERHASH) form.append("userhash", CATBOX_USERHASH);
    form.append("fileToUpload", file, file.name);

    console.log("[Catbox] Uploading to:", catboxAPI);

    const res = await fetch(catboxAPI, { method: "POST", body: form });
    const text = await res.text();

    if (!res.ok || text.startsWith("Error")) {
        throw new Error(`[Catbox] Upload failed: ${text}`);
    }

    return text;
}

async function uploadToLitterbox(file: File): Promise<string> {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    if (settings.store.litterboxTimelimit)
        form.append("time", String(settings.store.litterboxTimelimit));
    form.append("fileToUpload", file, file.name);

    console.log("[Litterbox] Uploading to:", litterboxAPI);

    const res = await fetch(litterboxAPI, { method: "POST", body: form });
    const text = await res.text();

    if (!res.ok || text.startsWith("Error")) {
        throw new Error(`[Litterbox] Upload failed: ${text}`);
    }

    return text;
}

function UploadModal({ modalProps }: { modalProps: ModalProps }) {
    const [file, setFile] = useState<File>();
    const [uploadedUrl, setUploadedUrl] = useState<string>();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string>();

    const handleFileUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(undefined);
        setUploadedUrl(undefined);

        try {
            // Plugin context bypasses CORS (i think?) | 14/02/25 update: no it fucking doesn't
            const result = await sendToFileHost(file);

            if (result.external && result.url) {
                setUploadedUrl(result.url);
            } else {
                setError("File is under Discord limit, not uploaded externally.");
            }
        } catch (err: any) {
            console.error("[UploadModal] Upload failed:", err);
            setError(err.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCopy = () => {
        if (uploadedUrl) navigator.clipboard.writeText(uploadedUrl);
    };

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Heading>Upload Large File</Heading>
            </ModalHeader>

            <ModalContent>
                <Paragraph style={{ color: "white" }}>Drag your file in this box:</Paragraph>
                <div
                    style={{
                        border: "2px dashed gray",
                        padding: 40,
                        textAlign: "center",
                        marginBottom: 10,
                        color: "white",
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer?.files[0];
                        if (f) setFile(f);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                >
                    {file ? `Selected: ${file.name}` : "Drop file here"}
                </div>

                <Button
                    onClick={async () => {
                        const f = await chooseFile("*/*");
                        if (f) setFile(f);
                    }}
                >
                    Or select File
                </Button>

                {isUploading && <Paragraph style={{ color: "yellow", marginTop: 10 }}>Uploading...</Paragraph>}
                {error && <Paragraph style={{ color: "red", marginTop: 10 }}>Error: {error}</Paragraph>}

                {uploadedUrl && (
                    <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 10 }}>
                        <Paragraph style={{ color: "white", margin: 0, wordBreak: "break-all" }}>
                            Uploaded URL:{" "}
                            <a href={uploadedUrl} target="_blank" style={{ color: "#4EA1F3" }}>
                                {uploadedUrl}
                            </a>
                        </Paragraph>
                        <Button onClick={handleCopy} disabled={!uploadedUrl}>
                            Copy
                        </Button>
                    </div>
                )}
            </ModalContent>

            <ModalFooter>
                <Button disabled={!file || isUploading} onClick={handleFileUpload}>
                    Upload
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}