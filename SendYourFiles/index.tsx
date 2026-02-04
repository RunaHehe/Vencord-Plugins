import definePlugin from "@utils/types";
import { settings } from "./settings";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { openModal, ModalRoot, ModalFooter, ModalHeader, ModalContent, ModalProps } from "@utils/modal";
import { Button, Menu, React, useState } from "@webpack/common";
import { Heading } from "@components/Heading";
import { chooseFile } from "@utils/web";
import { findByPropsLazy } from "@webpack";
import { ImageIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
const OptionClasses = findByPropsLazy("optionName", "optionIcon", "optionLabel");

const Native = VencordNative.pluginHelpers.SendYourFiles as PluginNative<typeof import("./native")>;



const ctxMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    children.push(
        <Menu.MenuItem
        id="send-large-file" //id
        label={
            <div className={OptionClasses.optionLabel}>
                <ImageIcon className={OptionClasses.optionIcon} height={24} width={24}/>
                <div className={OptionClasses.optionName}>Upload Large Files</div>
            </div>
        }
        action={() => openModal(modalProps => <UploadModal modalProps={modalProps} />)}
        disabled={false}
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
var buzzHeavierAPI = "https://w.buzzheavier.com"
var catboxAPI = "https://catbox.moe/user/api.php"
var litterboxAPI = "https://litterbox.catbox.moe/resources/internals/api.php"

const CATBOX_USERHASH = ""; // This would just be nothing, default hash is #### i believe?

const DISCORD_UPLOAD_LIMIT = 10 * 1024 * 1024; // Upload limit discord sets, in bytes (unless i'm stupid)

async function createMultipartBody(file: File, fields: Record<string, string> = {}) {
    const boundary = "----DiscordUploadBoundary" + Date.now();
    const crlf = "\r\n";
    const parts: Uint8Array[] = [];

    for (const key in fields) {
        const fieldPart = `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${fields[key]}${crlf}`;
        parts.push(new TextEncoder().encode(fieldPart));
    }

    const fileHeader = `--${boundary}${crlf}Content-Disposition: form-data; name="fileToUpload"; filename="${file.name}"${crlf}Content-Type: ${file.type || "application/octet-stream"}${crlf}${crlf}`;
    parts.push(new TextEncoder().encode(fileHeader));
    parts.push(new Uint8Array(await file.arrayBuffer())); // Content of the file the user uploads (dave, make sure to re-code this at some point since it's broken)
    parts.push(new TextEncoder().encode(`${crlf}--${boundary}--${crlf}`));

    const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
        body.set(part, offset);
        offset += part.length;
    }

    return { body, boundary };
}

async function sendToFileHost(
    file: File
): Promise<{external: boolean; url?: string}> {
    // File is under the limit, let Discord handle it themselves
    if (!exceedsDiscordLimit(file)) {
        return {external: false};
    }

    const host = settings.store.fileProvider as FileHost;

    if (exceedsHostLimit(file, host)) {
        throw new Error(`File too large for ${host}`);
    }

    let url: string;

    switch (host) {
        case "buzzheavier":
            url = await uploadToBuzzHeavier(file);
            break;
        case "catbox":
            url = await uploadFileToCatbox(file);
            break;
        case "litterbox":
            url = await uploadFileToLitterbox(file);
            break;
    }
    return {external: true, url};
}


function exceedsDiscordLimit(file: File): boolean {
    return file.size > DISCORD_UPLOAD_LIMIT;
}

function exceedsHostLimit(file: File, host: FileHost): boolean {
    switch (host) {
        case "catbox": return file.size > 200 * 1024 * 1024;
        case "litterbox": return file.size > 1024 * 1024 * 1024;
        case "buzzheavier": return false;
    }
}

async function uploadToBuzzHeavier(file: File): Promise<string> {
    const fileBuffer = new Uint8Array(await file.arrayBuffer());
    const uploadUrl = `${buzzHeavierAPI}/${encodeURIComponent(file.name)}`;

    const res = await Native.uploadFileNative(
        uploadUrl,
        file.name,
        fileBuffer,
        file.type || "application/octet-stream",
        "PUT"
    );

    if (res.status !== 200) {
        throw new Error(`BuzzHeavier upload failed: ${res.data}`);
    }

    try {
        const json = JSON.parse(res.data);
        if (!json.data?.id) throw new Error("BuzzHeavier returned invalid response");
        return `https://buzzheavier.com/${json.data.id}`;
    } catch {
        throw new Error("BuzzHeavier returned invalid JSON");
    }
}

async function uploadFileToLitterbox(file: File): Promise<string> {
    const { body, boundary } = await createMultipartBody(file, {
        reqtype: "fileupload",
        time: settings.store.litterboxTimelimit,
    });

    const res = await Native.uploadFileNative(
        litterboxAPI,
        file.name,
        body,
        `multipart/form-data; boundary=${boundary}`,
        "POST"
    );

    if (res.status !== 200 || res.data.startsWith("Error")) {
        throw new Error(`Litterbox upload failed: ${res.data}`);
    }

    return res.data;
}

async function uploadFileToCatbox(file: File): Promise<string> {
    const { body, boundary } = await createMultipartBody(
        file,
        CATBOX_USERHASH ? { userhash: CATBOX_USERHASH, reqtype: "fileupload" } : { reqtype: "fileupload" }
    );

    const res = await Native.uploadFileNative(
        catboxAPI,
        file.name,
        body,
        `multipart/form-data; boundary=${boundary}`,
        "POST"
    );

    if (res.status !== 200 || res.data.startsWith("Error")) {
        throw new Error(`Catbox upload failed: ${res.data}`);
    }

    return res.data;
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
            // Plugin context bypasses CORS (i think?)
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