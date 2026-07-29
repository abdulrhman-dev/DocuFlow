import { useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";
import toast from "react-hot-toast";
import {
    HiOutlineCloudArrowUp,
    HiOutlineDocumentCheck,
    HiOutlineDocumentText,
    HiOutlineXMark,
    HiOutlineXCircle,
    HiOutlineKey,
} from "react-icons/hi2";

import Heading from "@components/Heading";
import Button from "@components/Button";
import Modal from "@components/Modal";
import ActionButtons from "@components/ActionButtons";
import TextArea from "@components/inputs/TextArea";
import Autocomplete from "@components/inputs/Autocomplete";
import Empty from "@components/Empty";
import DirectorInstanceCard from "@features/director/DirectorInstanceCard";
import { useDirectorSearch } from "@features/director/hooks/useDirectorSearch";
import {
    useApproveDirector,
    useRejectDirector,
} from "@features/director/hooks/useDirector";
import { translator as t } from "@data/translations/ar";

const ACCEPTED_MIME = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024;

/* ---------- layout ---------- */

const Container = styled.form`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow-y: auto;
  gap: 2rem;
`;

const Content = styled.div`
  flex: 1 1 auto;
  height: 100%;
`;

const StyledHeading = styled(Heading)`
  margin-bottom: 3rem;
`;

const FormSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  margin-bottom: 3rem;
  align-items: start;
  height: 90%;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  height: 100%;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--color-grey-700);
  margin-bottom: 0.6rem;
`;

const SearchRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: stretch;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ModeSelect = styled.select`
  min-width: 18rem;
  padding: 1.2rem 1.4rem;
  border: 2px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-size: 1.4rem;
  color: var(--color-grey-700);
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--color-brand-600);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`;

const SelectionStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  overflow-y: auto;
  max-height: 58rem;
  background-color: var(--color-grey-100);
  padding: 1rem;
  border-radius: 0.7rem;
`;

const Footer = styled.footer`
  flex-shrink: 0;
  border-top: 1px solid var(--color-grey-200);
  padding-top: 2rem;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1.2rem;
  margin-top: auto;
`;

/* ---------- approval mode toggle ---------- */

const ApprovalModeRow = styled.div`
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1.2rem;
`;

const ModeTab = styled.button`
  border: 1px solid var(--color-grey-200);
  background: ${({ $active }) =>
        $active ? "var(--color-brand-600)" : "var(--color-grey-0)"};
  color: ${({ $active }) =>
        $active ? "var(--color-grey-0)" : "var(--color-grey-700)"};
  padding: 0.6rem 1.4rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.3rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s ease;

  & svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

/* ---------- OTP input ---------- */

const OtpInputWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.8rem 2rem;
  border: 2px dashed var(--color-grey-300);
  border-radius: 14px;
  background: var(--color-grey-50);
  align-items: center;
`;

const OtpIcon = styled.div`
  width: 5.6rem;
  height: 5.6rem;
  border-radius: 50%;
  background: var(--color-grey-100);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-brand-600);
  & svg {
    width: 3rem;
    height: 3rem;
  }
`;

const OtpInput = styled.input`
  width: 100%;
  max-width: 34rem;
  text-align: center;
  letter-spacing: 0.6rem;
  font-size: 1.4rem;
  font-weight: 700;
  padding: 1rem 1.2rem;
  border: 2px solid var(--color-grey-300);
  border-radius: 10px;
  background: var(--color-grey-0);
  color: var(--color-grey-800);

  &:focus {
    outline: none;
    border-color: var(--color-brand-600);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }
`;

const OtpHint = styled.small`
  color: var(--color-grey-500);
  font-size: 1.2rem;
  text-align: center;
`;

/* ---------- drop zone ---------- */

const Dropzone = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.6rem;
  padding: 1.8rem 2rem;
  border-radius: 14px;
  border: 2px dashed var(--color-grey-300);
  background: var(--color-grey-50);
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--color-brand-600);
    background: var(--color-grey-0);
  }
  &:focus-within {
    outline: none;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.18);
    border-color: var(--color-brand-600);
  }

  ${({ $isDragging }) =>
        $isDragging &&
        css`
      border-color: var(--color-brand-600);
      background: rgba(79, 70, 229, 0.05);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.12);
    `}

  ${({ $hasFile }) =>
        $hasFile &&
        css`
      border-style: solid;
      border-color: var(--color-brand-600);
      background: var(--color-grey-0);
    `}
`;

const DropIcon = styled.div`
  width: 5.6rem;
  height: 5.6rem;
  min-width: 5.6rem;
  border-radius: 50%;
  background: var(--color-grey-100);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-brand-600);
  & svg {
    width: 3rem;
    height: 3rem;
  }
`;
const DropText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
`;
const DropTitle = styled.span`
  font-size: 1.55rem;
  font-weight: 700;
  color: var(--color-grey-800);
`;
const DropHint = styled.span`
  font-size: 1.25rem;
  color: var(--color-grey-500);
`;
const HiddenInput = styled.input.attrs({ type: "file" })`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;
const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
  & > svg {
    width: 2.6rem;
    height: 2.6rem;
    color: var(--color-brand-600);
    flex-shrink: 0;
  }
`;
const FileMeta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;
const FileName = styled.span`
  font-weight: 700;
  color: var(--color-grey-800);
  font-size: 1.4rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const FileSize = styled.span`
  font-size: 1.2rem;
  color: var(--color-grey-500);
`;
const RemoveBtn = styled.button`
  background: var(--color-grey-100);
  border: none;
  color: var(--color-grey-600);
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  & svg {
    width: 1.8rem;
    height: 1.8rem;
  }
  &:hover {
    background: var(--color-red-100);
    color: var(--color-red-700);
  }
`;

const RejectBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 0.4rem 1rem 1rem;
  width: 50rem;
`;

/* ---------- helpers ---------- */

function humanSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function validateFile(f) {
    if (!ACCEPTED_MIME.includes(f.type)) return t.director.approvalFileHint;
    if (f.size > MAX_SIZE) return t.director.approvalFileTooLarge;
    return null;
}

/* ---------- page ---------- */

function DirectorApprovals() {
    const [selectedInstances, setSelectedInstances] = useState([]);
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const [approvalMode, setApprovalMode] = useState("file");
    const [otp, setOtp] = useState("");

    const {
        instances: results,
        isFetching: isSearching,
        setQuery,
        mode,
        setMode,
    } = useDirectorSearch({ enabled: true });

    const { approve, isPending: isApproving } = useApproveDirector();
    const { reject, isPending: isRejecting } = useRejectDirector();

    const options = useMemo(() => {
        const picked = new Set(selectedInstances.map((i) => i.id));
        return (results || []).filter((r) => !picked.has(r.id));
    }, [results, selectedInstances]);

    const selectedIds = selectedInstances.map((i) => i.id);

    function addInstance(inst) {
        if (!inst) return;
        if (selectedInstances.some((s) => s.id === inst.id)) return;
        setSelectedInstances((prev) => [...prev, inst]);
    }

    function addManyInstances(list) {
        if (!Array.isArray(list) || !list.length) return;
        setSelectedInstances((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            const additions = list.filter((it) => it && !seen.has(it.id));
            if (!additions.length) return prev;
            return [...prev, ...additions];
        });
    }

    function removeInstance(id) {
        setSelectedInstances((prev) => prev.filter((s) => s.id !== id));
    }

    /* -------- file picker / drop zone -------- */

    function acceptFile(f) {
        if (!f) return;
        const err = validateFile(f);
        if (err) return toast.error(err);
        setFile(f);
    }
    function onInputChange(e) {
        acceptFile(e.target.files?.[0]);
        e.target.value = "";
    }
    function onDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    }
    function onDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }
    function onDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        acceptFile(e.dataTransfer?.files?.[0]);
    }

    /* -------- submit -------- */

    async function handleApprove(e) {
        e?.preventDefault?.();
        if (!selectedIds.length) return toast.error(t.director.selectAtLeastOne);

        if (approvalMode === "otp") {
            if (!otp.trim()) return toast.error(t.director.otpPlaceholder);
            await approve({ ids: selectedIds, otp: otp.trim() });
            setOtp("");
        } else {
            if (!file) return toast.error(t.director.approvalFileRequired);
            await approve({ ids: selectedIds, file });
            setFile(null);
        }
        setSelectedInstances([]);
    }

    const canApprove =
        selectedIds.length > 0 &&
        (approvalMode === "otp" ? !!otp.trim() : !!file);

    /* -------- mode change handler -------- */
    function handleModeChange(e) {
        const next = e.target.value === "ids" ? "ids" : "text";
        setMode(next);
        setQuery("");
    }

    function handleAddAllIds() {
        if (!results?.length) {
            toast.error(t.director.empty);
            return;
        }
        addManyInstances(results);
        toast.success(`${t.director.selected}: +${results.length}`);
    }

    return (
        <Container onSubmit={handleApprove}>
            <Content>
                <StyledHeading as="h1">{t.director.inbox}</StyledHeading>

                <FormSection>
                    {/* ---------- Left column: search + selected cards ---------- */}
                    <Column>
                        <div>
                            <FieldLabel>{t.director.search}</FieldLabel>

                            <SearchRow>
                                <Autocomplete
                                    value={null}
                                    onChange={addInstance}
                                    items={options}
                                    isLoading={isSearching}
                                    onQueryChange={setQuery}
                                    itemKey={(it) => it.id}
                                    getInputValue={(it) =>
                                        mode === "ids"
                                            ? `#${it.id}`
                                            : `${it.workflow?.title || ""} — ${it.student?.name || it.studentId
                                            }`
                                    }
                                    renderItem={(it) => ({
                                        primary:
                                            mode === "ids"
                                                ? `#${it.id} · ${it.workflow?.title || ""}`
                                                : `${it.workflow?.title || ""} — ${it.student?.name || it.studentId
                                                }`,
                                        sub:
                                            mode === "ids"
                                                ? `${it.student?.name || it.studentId} · ${it.department?.name || ""}`
                                                : `#${it.id} · ${it.department?.name || ""}`,
                                    })}
                                    placeholder={
                                        mode === "ids"
                                            ? t.director.idsPlaceholder
                                            : t.director.textPlaceholder
                                    }
                                    showAvatar={false}
                                />

                                <ModeSelect
                                    value={mode}
                                    onChange={handleModeChange}
                                    aria-label={t.director.searchModeLabel}
                                    title={t.director.searchModeLabel}
                                >
                                    <option value="text">
                                        {t.director.modeText}
                                    </option>
                                    <option value="ids">
                                        {t.director.modeIds}
                                    </option>
                                </ModeSelect>
                            </SearchRow>

                            {mode === "ids" && (
                                <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
                                    <small style={{ color: "var(--color-grey-500)", fontSize: "1.2rem" }}>
                                        {t.director.idsHint}
                                    </small>
                                    <Button
                                        type="button"
                                        $variation="secondary"
                                        onClick={handleAddAllIds}
                                        disabled={!results?.length}
                                    >
                                        {t.director.addAllMatches}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div>
                            <FieldLabel>{t.director.selected}</FieldLabel>
                            {selectedInstances.length === 0 ? (
                                <Empty resource={t.director.selectedEmpty} />
                            ) : (
                                <SelectionStack>
                                    {selectedInstances.map((inst) => (
                                        <DirectorInstanceCard
                                            key={inst.id}
                                            instance={inst}
                                            onRemove={removeInstance}
                                        />
                                    ))}
                                </SelectionStack>
                            )}
                        </div>
                    </Column>

                    {/* ---------- Right column: approval mode + input ---------- */}
                    <Column>
                        {/* Approval mode toggle */}
                        <div>
                            <FieldLabel>{t.director.approvalMode}</FieldLabel>
                            <ApprovalModeRow>
                                <ModeTab
                                    type="button"
                                    $active={approvalMode === "file"}
                                    onClick={() => setApprovalMode("file")}
                                >
                                    <HiOutlineCloudArrowUp />
                                    {t.director.approvalModeFile}
                                </ModeTab>
                                <ModeTab
                                    type="button"
                                    $active={approvalMode === "otp"}
                                    onClick={() => setApprovalMode("otp")}
                                >
                                    <HiOutlineKey />
                                    {t.director.approvalModeOtp}
                                </ModeTab>
                            </ApprovalModeRow>
                        </div>

                        {/* File mode — drop zone (existing) */}
                        {approvalMode === "file" && (
                            <div>
                                <FieldLabel>{t.director.approvalFile}</FieldLabel>
                                <Dropzone
                                    htmlFor="approvalFile"
                                    $isDragging={isDragging}
                                    $hasFile={!!file}
                                    onDragOver={onDragOver}
                                    onDragEnter={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                >
                                    <HiddenInput
                                        id="approvalFile"
                                        ref={fileInputRef}
                                        accept={ACCEPTED_MIME.join(",")}
                                        onChange={onInputChange}
                                    />
                                    {!file ? (
                                        <>
                                            <DropIcon>
                                                <HiOutlineCloudArrowUp />
                                            </DropIcon>
                                            <DropText>
                                                <DropTitle>{t.director.dropzoneTitle}</DropTitle>
                                                <DropHint>{t.director.dropzoneHint}</DropHint>
                                                <DropHint>{t.director.approvalFileHint}</DropHint>
                                            </DropText>
                                        </>
                                    ) : (
                                        <>
                                            <FilePreview>
                                                <HiOutlineDocumentText />
                                                <FileMeta>
                                                    <FileName>{file.name}</FileName>
                                                    <FileSize>{humanSize(file.size)}</FileSize>
                                                </FileMeta>
                                            </FilePreview>
                                            <RemoveBtn
                                                type="button"
                                                aria-label="remove"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setFile(null);
                                                }}
                                            >
                                                <HiOutlineXMark />
                                            </RemoveBtn>
                                        </>
                                    )}
                                </Dropzone>
                            </div>
                        )}

                        {/* OTP mode — code input */}
                        {approvalMode === "otp" && (
                            <div>
                                <FieldLabel>{t.director.approvalModeOtp}</FieldLabel>
                                <OtpInputWrap>
                                    <OtpIcon>
                                        <HiOutlineKey />
                                    </OtpIcon>
                                    <OtpInput
                                        type="text"
                                        value={otp}
                                        onChange={(e) =>
                                            setOtp(
                                                e.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 6)
                                            )
                                        }
                                        placeholder={t.director.otpPlaceholder}
                                        maxLength={6}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                    />
                                    <OtpHint>{t.director.otpHint}</OtpHint>
                                </OtpInputWrap>
                            </div>
                        )}

                        <ButtonRow>
                            <Button
                                type="submit"
                                $size="large"
                                loading={isApproving}
                                disabled={!canApprove}
                                icon={<HiOutlineDocumentCheck />}
                            >
                                {t.director.approve}
                            </Button>

                            <Modal>
                                <Modal.Open opens="director-reject">
                                    <Button
                                        $variation="danger"
                                        $size="large"
                                        disabled={!selectedIds.length}
                                        icon={<HiOutlineXCircle />}
                                    >
                                        {t.director.reject}
                                    </Button>
                                </Modal.Open>
                                <Modal.Window name="director-reject">
                                    <DirectorRejectBox
                                        isSubmitting={isRejecting}
                                        onSubmit={async (reason) => {
                                            await reject({ ids: selectedIds, reason });
                                            setSelectedInstances([]);
                                        }}
                                    />
                                </Modal.Window>
                            </Modal>
                        </ButtonRow>
                    </Column>
                </FormSection>
            </Content>
        </Container>
    );
}

function DirectorRejectBox({ onSubmit, isSubmitting, onClose }) {
    const [reason, setReason] = useState("");
    return (
        <RejectBox>
            <TextArea
                value={reason}
                placeholder={t.director.rejectionReason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
            />
            <ActionButtons
                onCancel={() => onClose?.()}
                onSave={async () => {
                    if (!reason.trim()) return;
                    await onSubmit(reason);
                    onClose?.();
                }}
                textCancel={t.actions.cancel}
                textSave={t.director.reject}
                isApproveDanger
                isSaving={isSubmitting}
            />
        </RejectBox>
    );
}

export default DirectorApprovals;