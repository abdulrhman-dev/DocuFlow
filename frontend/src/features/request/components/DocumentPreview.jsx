import { useEffect, useRef } from "react";
import styled from "styled-components";
import { HiPrinter, HiXMark, HiArrowDownTray } from "react-icons/hi2";

import Spinner from "@components/Spinner";
import Button from "@components/Button";
import { useGetDocPdf } from "../hooks/useGetDocPdf";
import { translator as t } from "@data/translations/ar";

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 60rem;
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

const IframeContainer = styled.div`
  flex: 1;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  background-color: var(--color-grey-100);
  position: relative;
  min-height: 50rem;
`;

const StyledIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-red-700);
  font-size: 1.6rem;
`;


function DocumentPreview({ docId, onClose }) {
    const id = docId;

    const { url, filename, isPending, error } = useGetDocPdf({ docId: id });
    const iframeRef = useRef(null);
    // A second hidden iframe used only for silent printing so the on-screen
    // preview iframe doesn't lose scroll position.
    const printFrameRef = useRef(null);

    useEffect(() => {
        return () => {
            if (printFrameRef.current) {
                printFrameRef.current.remove();
                printFrameRef.current = null;
            }
        };
    }, []);

    function handlePrint() {
        if (!url) return;

        // Reuse hidden iframe if we already created it.
        if (printFrameRef.current) {
            printFrameRef.current.remove();
            printFrameRef.current = null;
        }

        const frame = document.createElement("iframe");
        frame.style.position = "fixed";
        frame.style.right = "0";
        frame.style.bottom = "0";
        frame.style.width = "0";
        frame.style.height = "0";
        frame.style.border = "0";
        frame.src = url;
        document.body.appendChild(frame);
        printFrameRef.current = frame;

        frame.onload = () => {
            // Give the embedded PDF a tick to be ready in Chromium/Firefox.
            setTimeout(() => {
                try {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                } catch (err) {
                    // Fallback: open in a new tab, which invariably supports print.
                    window.open(url, "_blank");
                }
            }, 250);
        };
    }

    function handleDownload() {
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
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

            <IframeContainer>
                <StyledIframe
                    ref={iframeRef}
                    src={url}
                    title="Document Preview"
                />
            </IframeContainer>
        </PreviewContainer>
    );
}

export default DocumentPreview;
