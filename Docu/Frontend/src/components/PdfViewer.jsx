import { useMemo } from "react";
import styled from "styled-components";
import {
    Viewer,
    Worker,
    SpecialZoomLevel,
} from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { fullScreenPlugin } from "@react-pdf-viewer/full-screen";
import { printPlugin } from "@react-pdf-viewer/print";
import { getFilePlugin } from "@react-pdf-viewer/get-file";

import {
    HiChevronLeft,
    HiChevronRight,
    HiOutlineMagnifyingGlassMinus,
    HiOutlineMagnifyingGlassPlus,
    HiOutlineArrowsPointingOut,
    HiOutlineArrowsPointingIn,
    HiOutlinePrinter,
    HiOutlineArrowDownTray,
} from "react-icons/hi2";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import "@react-pdf-viewer/full-screen/lib/styles/index.css";

// Pin the worker to the same version as the installed `pdfjs-dist`.
// Vite serves this file straight from node_modules with its correct URL.
// import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js"

/* ---------- layout ---------- */

const Root = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 60rem;
  gap: 1rem;
  color: var(--color-grey-700);
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.2rem;
  background: var(--color-grey-50);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  direction: ltr; /* keep tool positions consistent regardless of doc direction */
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const IconBtn = styled.button`
  border: 1px solid var(--color-grey-200);
  background: var(--color-grey-0);
  color: var(--color-grey-700);
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease,
    transform 0.15s ease, box-shadow 0.15s ease;
  & svg {
    width: 1.7rem;
    height: 1.7rem;
  }
  &:hover:not(:disabled) {
    background: var(--color-brand-600);
    border-color: var(--color-brand-600);
    color: var(--color-grey-0);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PageBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: var(--color-grey-0);
  color: var(--color-grey-700);
  border: 1px solid var(--color-grey-200);
  font-size: 1.25rem;
  font-weight: 600;
  min-width: 5rem;
  justify-content: center;
`;

const ZoomBadge = styled(PageBadge)`
  min-width: 5.5rem;
`;

const Stage = styled.div`
  flex: 1;
  min-height: 50rem;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  background: var(--color-grey-100);
  position: relative;

  /* ---- viewer surface polish + disable in-viewer selection/copy when read-only ---- */
  & .rpv-core__inner-page {
    background: var(--color-grey-100);
  }
  & .rpv-core__page-layer {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    overflow: hidden;
  }
  ${({ $readOnly }) =>
        $readOnly &&
        `
    & .rpv-core__text-layer,
    & .rpv-core__annotation-layer {
      /* still rendered so screen readers get the text, but not selectable */
      user-select: none;
      pointer-events: none;
    }
    & canvas {
      user-select: none;
      -webkit-user-drag: none;
    }
  `}
`;

/* ---------- component ---------- */

/**
 * Modern PDF viewer with a custom, minimal toolbar.
 *
 *   <PdfViewer
 *     fileUrl={url}
 *     onPrint={() => ...}       // optional; hides Print button if omitted
 *     onDownload={() => ...}    // optional; hides Download button if omitted
 *     readOnly={true}           // suppresses right-click menu, drag, text selection
 *   />
 *
 * The viewer itself renders NO built-in toolbar, NO print/download/open menus,
 * NO sidebar. Only your explicit props enable those actions.
 */
function PdfViewer({
    fileUrl,
    onPrint,
    onDownload,
    readOnly = true,
    height = "100%",
}) {
    const pageNav = useMemo(() => pageNavigationPlugin(), []);
    const zoom = useMemo(() => zoomPlugin({ enableShortcuts: false }), []);
    const fullscreen = useMemo(() => fullScreenPlugin(), []);
    // We keep these plugin instances registered ONLY when the caller opted in.
    // The buttons themselves are our custom icon buttons; the plugins provide
    // the imperative APIs and PdfPrintDialog UI.
    const print = useMemo(
        () => (onPrint ? printPlugin() : null),
        [onPrint],
    );
    const getFile = useMemo(
        () => (onDownload ? getFilePlugin() : null),
        [onDownload],
    );

    const {
        CurrentPageLabel,
        NumberOfPages,
        GoToNextPage,
        GoToPreviousPage,
    } = pageNav;
    const {
        CurrentScale,
        ZoomIn,
        ZoomOut,
    } = zoom;
    const { EnterFullScreen } = fullscreen;

    const plugins = [pageNav, zoom, fullscreen];
    if (print) plugins.push(print);
    if (getFile) plugins.push(getFile);

    // Block the native "Save as / Print" context menu on the viewer surface when
    // the parent says this is read-only. This is purely a UX guardrail — a
    // determined user can still hit devtools, so it is NOT a security control.
    function blockContextMenu(e) {
        if (readOnly) e.preventDefault();
    }

    if (!fileUrl) return null;

    return (
        <Root style={{ height }}>
            <Toolbar>
                <Group>
                    <GoToPreviousPage>
                        {(props) => (
                            <IconBtn
                                type="button"
                                title="Previous page"
                                onClick={props.onClick}
                                disabled={props.isDisabled}
                            >
                                <HiChevronRight />
                            </IconBtn>
                        )}
                    </GoToPreviousPage>

                    <PageBadge>
                        <CurrentPageLabel>
                            {(props) => <span>{props.currentPage + 1}</span>}
                        </CurrentPageLabel>
                        <span>/</span>
                        <NumberOfPages />
                    </PageBadge>

                    <GoToNextPage>
                        {(props) => (
                            <IconBtn
                                type="button"
                                title="Next page"
                                onClick={props.onClick}
                                disabled={props.isDisabled}
                            >
                                <HiChevronLeft />
                            </IconBtn>
                        )}
                    </GoToNextPage>
                </Group>

                <Group>
                    <ZoomOut>
                        {(props) => (
                            <IconBtn
                                type="button"
                                title="Zoom out"
                                onClick={props.onClick}
                            >
                                <HiOutlineMagnifyingGlassMinus />
                            </IconBtn>
                        )}
                    </ZoomOut>

                    <ZoomBadge>
                        <CurrentScale>
                            {(props) => <span>{Math.round(props.scale * 100)}%</span>}
                        </CurrentScale>
                    </ZoomBadge>

                    <ZoomIn>
                        {(props) => (
                            <IconBtn
                                type="button"
                                title="Zoom in"
                                onClick={props.onClick}
                            >
                                <HiOutlineMagnifyingGlassPlus />
                            </IconBtn>
                        )}
                    </ZoomIn>

                    <EnterFullScreen>
                        {(props) => (
                            <IconBtn
                                type="button"
                                title="Full screen"
                                onClick={props.onClick}
                            >
                                {props.isFullScreen ? (
                                    <HiOutlineArrowsPointingIn />
                                ) : (
                                    <HiOutlineArrowsPointingOut />
                                )}
                            </IconBtn>
                        )}
                    </EnterFullScreen>

                    {onPrint && (
                        <IconBtn type="button" title="Print" onClick={onPrint}>
                            <HiOutlinePrinter />
                        </IconBtn>
                    )}

                    {onDownload && (
                        <IconBtn type="button" title="Download" onClick={onDownload}>
                            <HiOutlineArrowDownTray />
                        </IconBtn>
                    )}
                </Group>
            </Toolbar>

            <Stage $readOnly={readOnly} onContextMenu={blockContextMenu}>
                <Worker workerUrl={pdfWorkerUrl}>
                    <Viewer
                        fileUrl={fileUrl}
                        plugins={plugins}
                        defaultScale={SpecialZoomLevel.PageWidth}
                        /* Never show the built-in sidebar / toolbar. */
                        renderLoader={() => null}
                    /* Disable text/annotation layers ONLY if the caller wants a
                       truly frozen view. We keep them by default so users can select
                       text — but read-only makes them non-interactive via CSS. */
                    />
                </Worker>
            </Stage>
        </Root>
    );
}

export default PdfViewer;
