import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { HiPrinter, HiXMark, HiArrowDownTray } from "react-icons/hi2";
import { Viewer, Worker } from "@react-pdf-viewer/core";

import "@react-pdf-viewer/core/lib/styles/index.css";

import Spinner from "@components/Spinner";
import Button from "@components/Button";
import { useGetDocPdf } from "../hooks/useGetDocPdf";
import { API_URL } from "@utils/consts";
import { translator as t } from "@data/translations/ar";

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 72rem;
  min-width: 50rem;
  gap: 1.2rem;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--color-grey-50);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--color-grey-200);
  flex-shrink: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
`;

const ViewerContainer = styled.div`
  flex: 1;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  background-color: var(--color-grey-100);
  position: relative;
  min-height: 50rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-red-700);
  font-size: 1.6rem;
`;

// Must match the installed pdfjs-dist version exactly.
const PDF_WORKER_URL = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

async function fetchPrintablePdfUrl(docId) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/document/${docId}/pdf?print=true`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        let msg = "Failed to fetch printable PDF";
        try {
            const j = await res.json();
            msg = j.message || msg;
        } catch (_) { }
        throw new Error(msg);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

function DocumentPreview({ docId, onClose }) {
    const id = docId;

    // Preview URL (viewing, no footer, no print stamp).
    const { url, filename, isPending, error } = useGetDocPdf({ docId: id });

    // Hidden iframe used for silent printing. It fetches the *print* variant
    // from the backend (footer-stamped) and calls contentWindow.print().
    // Kept as a bare <iframe>, not the PDF viewer itself, since the viewer
    // has no toolbar/print UI at all now — this is the ONLY print path.
    const printFrameRef = useRef(null);
    const printBlobUrlRef = useRef(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        return () => {
            if (printFrameRef.current) {
                printFrameRef.current.remove();
                printFrameRef.current = null;
            }
            if (printBlobUrlRef.current) {
                URL.revokeObjectURL(printBlobUrlRef.current);
                printBlobUrlRef.current = null;
            }
        };
    }, []);

    async function handlePrint() {
        try {
            setIsPrinting(true);

            // Clean up any previous print attempt.
            if (printFrameRef.current) {
                printFrameRef.current.remove();
                printFrameRef.current = null;
            }
            if (printBlobUrlRef.current) {
                URL.revokeObjectURL(printBlobUrlRef.current);
                printBlobUrlRef.current = null;
            }

            const printUrl = await fetchPrintablePdfUrl(id);
            printBlobUrlRef.current = printUrl;

            const frame = document.createElement("iframe");
            frame.style.position = "fixed";
            frame.style.right = "0";
            frame.style.bottom = "0";
            frame.style.width = "0";
            frame.style.height = "0";
            frame.style.border = "0";
            frame.src = printUrl;
            document.body.appendChild(frame);
            printFrameRef.current = frame;

            frame.onload = () => {
                setTimeout(() => {
                    try {
                        frame.contentWindow.focus();
                        frame.contentWindow.print();
                    } catch (_err) {
                        window.open(printUrl, "_blank");
                    }
                }, 250);
            };
        } catch (e) {
            // eslint-disable-next-line no-alert
            alert(e.message);
        } finally {
            setIsPrinting(false);
        }
    }

    async function handleDownload() {
        const printUrl = await fetchPrintablePdfUrl(id);
        const a = document.createElement("a");
        a.href = printUrl;
        a.download = filename || `document-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    if (isPending) return <Spinner />;
    if (error) return <ErrorMessage>{error.message}</ErrorMessage>;

    return (
        <PreviewContainer>
            <Toolbar>
                <ButtonGroup>
                    <Button
                        $variation="secondary"
                        size="small"
                        onClick={handlePrint}
                        loading={isPrinting}
                        icon={<HiPrinter />}
                    >
                        {t.documents.print}
                    </Button>
                    <Button
                        $variation="secondary"
                        size="small"
                        onClick={handleDownload}
                        icon={<HiArrowDownTray />}
                    >
                        {t.documents.download}
                    </Button>
                </ButtonGroup>
                {onClose && (
                    <Button
                        $variation="secondary"
                        size="small"
                        onClick={onClose}
                        icon={<HiXMark />}
                    >
                        {t.documents.closePreview}
                    </Button>
                )}
            </Toolbar>

            <ViewerContainer>
                {url && (
                    <Worker workerUrl={PDF_WORKER_URL}>
                        {/* key forces a full remount when the blob URL changes */}
                        <Viewer key={url} fileUrl={url} theme="light" />
                    </Worker>
                )}
            </ViewerContainer>
        </PreviewContainer>
    );
}

export default DocumentPreview;