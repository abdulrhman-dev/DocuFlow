import { useRef } from "react";
import styled from "styled-components";
import { HiXMark } from "react-icons/hi2";

import Spinner from "@components/Spinner";
import Button from "@components/Button";
import { useOutsideDocPdf } from "./hooks/useOutsideDocPdf";
import { translator as t } from "@data/translations/ar";
import { Viewer, Worker } from "@react-pdf-viewer/core";

const PDF_WORKER_URL = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

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
  justify-content: flex-end;
  align-items: center;
  padding: 1rem;
  background-color: var(--color-grey-50);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--color-grey-200);
  flex-shrink: 0;
`;


const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-red-700);
  font-size: 1.6rem;
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

function OutsideDocumentPreview({ token, docId, onClose }) {
    const { url, isPending, error } = useOutsideDocPdf({ token, docId });

    if (isPending) return <Spinner />;
    if (error) return <ErrorMessage>{error.message}</ErrorMessage>;

    return (
        <PreviewContainer>
            <Toolbar>
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

export default OutsideDocumentPreview;
