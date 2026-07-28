import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import toast from "react-hot-toast";

import Heading from "@components/Heading";
import Spinner from "@components/Spinner";
import Button from "@components/Button";
import Modal from "@components/Modal";
import TextArea from "@components/inputs/TextArea";
import ActionButtons from "@components/ActionButtons";
import OutsideRequestedDoc from "@features/outside/OutsideRequestedDoc";
import {
    fetchOutsideView,
    submitOutsideResponse,
} from "@features/outside/services/outside";
import { translator as t } from "@data/translations/ar";

const Page = styled.div`
  min-height: 100vh;
  background: var(--color-grey-50);
  direction: rtl;
  padding: 3rem 1.6rem;
  display: flex;
  justify-content: center;
`;

const Card = styled.div`
  width: min(80rem, 100%);
  background: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  padding: 2rem 2.4rem;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
`;

const Meta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: 0.8rem 2rem;
  font-size: 1.3rem;
  color: var(--color-grey-700);

  & span:first-child {
    color: var(--color-grey-500);
    font-size: 1.15rem;
    display: block;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
`;

const StatusBanner = styled.div`
  padding: 1.2rem 1.4rem;
  border-radius: 10px;
  font-weight: 600;
  ${({ $s }) =>
        $s === "approved"
            ? "background: var(--color-green-100); color: var(--color-green-700);"
            : $s === "rejected"
                ? "background: var(--color-red-100); color: var(--color-red-700);"
                : ""}
`;

const RejectBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 0.4rem 1rem 1rem;
  width: 50rem;
`;

const DocsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 1.6rem;
`;

function OutsideRespond() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    async function reload() {
        try {
            setError(null);
            const d = await fetchOutsideView(token);
            setData(d);
        } catch (e) {
            setError(e.message);
        }
    }

    useEffect(() => {
        reload();
    }, [token]);

    if (error) {
        return (
            <Page>
                <Card>
                    <Heading as="h2">{t.outside.respondPage.title}</Heading>
                    <StatusBanner $s="rejected">
                        {t.outside.respondPage.linkExpired}
                    </StatusBanner>
                </Card>
            </Page>
        );
    }
    if (!data) return <Page><Card><Spinner /></Card></Page>;

    const req = data;
    const my = req.myOutsideAssignment;
    const already = my?.status && my.status !== "pending";
    const viewer = req.viewer;

    async function handleApprove() {
        try {
            setBusy(true);
            await submitOutsideResponse(token, { newStatus: "approved" });
            toast.success(t.outside.respondPage.thankYouApproved);
            await reload();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    }
    async function handleReject(reason) {
        try {
            setBusy(true);
            await submitOutsideResponse(token, {
                newStatus: "rejected",
                rejectionReason: reason,
            });
            toast.success(t.outside.respondPage.thankYouRejected);
            await reload();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Page>
            <Card>
                <Heading as="h2">{t.outside.respondPage.title}</Heading>
                <Meta>
                    <div>
                        <span>{t.outside.respondPage.viewingAs}</span>
                        {viewer?.firstName} {viewer?.lastName} · {viewer?.email}
                    </div>
                    <div>
                        <span>#</span>
                        {req.id}
                    </div>
                    <div>
                        <span>{t.request.request}</span>
                        {req.workflowTitle || ""}
                    </div>
                    <div>
                        <span>{t.workflow.selectStudent}</span>
                        {req.student?.name} — {req.student?.code}
                    </div>
                    <div>
                        <span>{t.time?.on || ""}</span>
                        {req.sentAt
                            ? format(new Date(req.sentAt), "EEEE d MMMM yyyy, h:mm a", {
                                locale: ar,
                            })
                            : ""}
                    </div>
                </Meta>

                {req.documents?.length > 0 && (
                    <DocsGrid>
                        {req.documents.map((d) => (
                            <OutsideRequestedDoc
                                key={d.id}
                                token={token}
                                doc={{ id: d.id, name: d.name }}
                            />
                        ))}
                    </DocsGrid>
                )}

                {already ? (
                    <StatusBanner $s={my.status}>
                        {my.status === "approved"
                            ? t.outside.respondPage.thankYouApproved
                            : t.outside.respondPage.thankYouRejected}
                    </StatusBanner>
                ) : (
                    <Row>
                        <Button
                            $variation="primary"
                            onClick={handleApprove}
                            loading={busy}
                        >
                            {t.outside.respondPage.approve}
                        </Button>
                        <Modal>
                            <Modal.Open opens="outside-reject">
                                <Button $variation="danger" type="button" loading={busy}>
                                    {t.outside.respondPage.reject}
                                </Button>
                            </Modal.Open>
                            <Modal.Window name="outside-reject">
                                <OutsideRejectBox
                                    isSubmitting={busy}
                                    onSubmit={handleReject}
                                />
                            </Modal.Window>
                        </Modal>
                    </Row>
                )}
            </Card>
        </Page>
    );
}

function OutsideRejectBox({ onClose, onSubmit, isSubmitting }) {
    const [reason, setReason] = useState("");
    return (
        <RejectBox>
            <TextArea
                value={reason}
                placeholder={t.outside.respondPage.rejectReason}
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
                textSave={t.outside.respondPage.reject}
                isApproveDanger
                isSaving={isSubmitting}
            />
        </RejectBox>
    );
}

export default OutsideRespond;
