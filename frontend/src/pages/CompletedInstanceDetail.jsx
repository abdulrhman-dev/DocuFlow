import { useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import Heading from "@components/Heading";
import Spinner from "@components/Spinner";
import Button from "@components/Button";
import Modal from "@components/Modal";
import TextArea from "@components/inputs/TextArea";
import ActionButtons from "@components/ActionButtons";
import RequestedDoc from "@features/request/components/RequestedDoc";
import {
    useDeanInstance,
    useExecuteInstance,
    useRejectInstance,
} from "@features/dean/hooks/useDeanInstances";
import { translator as t } from "@data/translations/ar";

const Page = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  direction: rtl;
`;

const HeaderCard = styled.div`
  padding: 1.6rem 2rem;
  background: var(--color-grey-0);
  border-radius: 12px;
  border: 1px solid var(--color-grey-200);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: 1rem 2rem;
  margin-top: 1rem;
  color: var(--color-grey-700);
  font-size: 1.35rem;

  & span:first-child {
    color: var(--color-grey-500);
    font-size: 1.15rem;
    display: block;
  }
`;

const StageBlock = styled.section`
  background: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: 12px;
  padding: 1.6rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const StageHead = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  & h3 {
    margin: 0;
    color: var(--color-grey-800);
  }
`;

const StageOrder = styled.span`
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 50%;
  background: var(--color-brand-600);
  color: var(--color-grey-0);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const DocsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 2rem;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 1.2rem;
  justify-content: flex-start;
  padding-top: 1rem;
`;

const StatusBanner = styled.div`
  padding: 1.2rem 1.6rem;
  border-radius: 10px;
  font-weight: 600;

  ${({ $status }) =>
        $status === "executed"
            ? "background: var(--color-green-100); color: var(--color-green-700);"
            : $status === "rejected"
                ? "background: var(--color-red-100); color: var(--color-red-700);"
                : "background: var(--color-brand-100, #eef); color: var(--color-brand-700, #333);"}
`;

const RejectContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  padding: 0.4rem 1rem 1rem;
  width: 50rem;
`;

function CompletedInstanceDetail() {
    const { id } = useParams();
    const { data, isPending } = useDeanInstance(id);
    const { execute, isPending: isExecuting } = useExecuteInstance(id);
    const { reject, isPending: isRejecting } = useRejectInstance(id);

    if (isPending || !data) return <Spinner />;

    const { instance, stageBlocks } = data;
    const status = instance.status;

    return (
        <Page>
            <HeaderCard>
                <Heading as="h1">
                    {instance.workflow?.title} — {instance.student?.name}
                </Heading>
                <InfoGrid>
                    <div>
                        <span>{t.instance.department}</span>
                        {instance.department?.name}
                    </div>
                    <div>
                        <span>{t.instance.createdBy}</span>
                        {instance.user?.firstName} {instance.user?.lastName}
                    </div>
                    <div>
                        <span>{t.instance.instanceId}</span>#{instance.id}
                    </div>
                    <div>
                        <span>{t.status[status] || status}</span>
                        {instance.deanReviewedAt
                            ? format(
                                new Date(instance.deanReviewedAt),
                                "d MMMM yyyy, h:mm a",
                                { locale: ar },
                            )
                            : ""}
                    </div>
                </InfoGrid>
                {status === "rejected" && instance.deanRejectionReason && (
                    <div style={{ marginTop: "1rem", color: "var(--color-red-700)" }}>
                        <strong>{t.dean.rejectionReason}:</strong>{" "}
                        {instance.deanRejectionReason}
                    </div>
                )}
            </HeaderCard>

            {stageBlocks.map((s) => (
                <StageBlock key={s.id}>
                    <StageHead>
                        <StageOrder>{s.stageOrder}</StageOrder>
                        <Heading as="h3">{s.title}</Heading>
                    </StageHead>

                    {s.documents.length === 0 ? (
                        <div style={{ color: "var(--color-grey-500)" }}>
                            {t.dean.noDocumentsAtStage}
                        </div>
                    ) : (
                        <DocsGrid>
                            {s.documents.map((d) => (
                                <RequestedDoc
                                    key={d.id}
                                    doc={{ id: d.id, name: d.name }}
                                    type="documents"
                                    mode="view"
                                />
                            ))}
                        </DocsGrid>
                    )}
                </StageBlock>
            ))}

            {status === "completed" ? (
                <ActionsRow>
                    <Button
                        $variation="primary"
                        loading={isExecuting}
                        onClick={() => execute()}
                    >
                        {t.dean.execute}
                    </Button>
                    <Modal>
                        <Modal.Open opens="dean-reject">
                            <Button $variation="danger" type="button">
                                {t.dean.reject}
                            </Button>
                        </Modal.Open>
                        <Modal.Window name="dean-reject">
                            <DeanRejectWindow
                                onSubmit={(reason) => reject(reason)}
                                isSubmitting={isRejecting}
                            />
                        </Modal.Window>
                    </Modal>
                </ActionsRow>
            ) : (
                <StatusBanner $status={status}>
                    {status === "executed" ? t.dean.executed : t.dean.rejected}
                </StatusBanner>
            )}
        </Page>
    );
}

function DeanRejectWindow({ onClose, onSubmit, isSubmitting }) {
    const [reason, setReason] = useState("");
    return (
        <RejectContainer>
            <TextArea
                value={reason}
                placeholder={t.request.rejectionReason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
            />
            <ActionButtons
                onCancel={() => onClose()}
                onSave={() => {
                    if (!reason.trim()) return;
                    onSubmit(reason);
                    onClose?.();
                }}
                textCancel={t.actions.cancel}
                textSave={t.dean.reject}
                isCancelDanger={false}
                isApproveDanger={true}
                isSaving={isSubmitting}
            />
        </RejectContainer>
    );
}

export default CompletedInstanceDetail;
