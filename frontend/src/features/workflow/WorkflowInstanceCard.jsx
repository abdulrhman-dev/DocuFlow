import styled, { css } from "styled-components";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { HiCheckCircle, HiXCircle, HiClock } from "react-icons/hi2";

import Row from "@components/Row";
import ID from "@components/ID";
import WorkflowStepper from "./WorkflowStepper";
import { translator as t } from "@data/translations/ar";

const Card = styled.div`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  width: 100%;
  background: var(--color-grey-0);
  border-radius: 12px;
  border: 1px solid var(--color-grey-200);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  direction: rtl;
  position: relative;

  ${({ $status }) =>
    $status === "completed" &&
    css`
      border-left: 6px solid var(--color-green-700);
      background: linear-gradient(
        90deg,
        var(--color-green-100) 0%,
        var(--color-grey-0) 30%
      );
    `}

  ${({ $status }) =>
    $status === "rejected" &&
    css`
      border-left: 6px solid var(--color-red-700);
      background: linear-gradient(
        90deg,
        var(--color-red-100) 0%,
        var(--color-grey-0) 30%
      );
    `}
`;

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const Header = styled.span`
  font-weight: 700;
  font-size: 1.8rem;
  color: var(--color-grey-800);
`;

const Dates = styled.span`
  font-size: 1.3rem;
  color: var(--color-grey-500);
`;

const IDWrapper = styled.div`
  margin-inline-start: auto;
  font-weight: 600;
  color: var(--color-brand-600);
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.6rem;

  ${({ $status }) =>
    $status === "completed" &&
    css`
      background: var(--color-green-100);
      color: var(--color-green-700);
    `}

  ${({ $status }) =>
    $status === "rejected" &&
    css`
      background: var(--color-red-100);
      color: var(--color-red-700);
    `}

  ${({ $status }) =>
    $status === "in_progress" &&
    css`
      background: var(--color-brand-100, #eef);
      color: var(--color-brand-700, #333);
    `}

  & svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

const RejectedDetail = styled.div`
  margin-top: 0.4rem;
  font-size: 1.25rem;
  color: var(--color-red-700);

  & strong {
    font-weight: 700;
  }
`;

function statusIcon(status) {
  if (status === "completed") return <HiCheckCircle />;
  if (status === "rejected") return <HiXCircle />;
  return <HiClock />;
}

function statusLabel(status) {
  if (status === "completed") return t.status.completed;
  if (status === "rejected") return t.status.rejected;
  return t.status.inProgress;
}

function WorkflowInstanceCard({ instance }) {
  let status = instance.status || "in_progress";


  // TODO: Please don't laugh
  if (status === "executed")
    status = "completed"


  return (
    <Card $status={status}>
      <Row type="horizontal" style={{ justifyContent: "space-between" }}>
        <HeaderContainer>
          <Header>{instance.header}</Header>
          <Dates>
            {format(new Date(instance.start_datetime), "d MMMM yyyy", {
              locale: ar,
            })}
            {" - "}
            {format(new Date(instance.last_updated_datetime), "d MMMM yyyy", {
              locale: ar,
            })}
          </Dates>
          <StatusBadge $status={status}>
            {statusIcon(status)}
            {statusLabel(status)}
          </StatusBadge>
          {status === "rejected" && (instance.rejected_stage_title || instance.current_stage_title) && (
            <RejectedDetail>
              {t.instance.rejectedAtStage}{" "}
              <strong>
                {instance.rejected_stage_title || instance.current_stage_title}
              </strong>
            </RejectedDetail>
          )}
        </HeaderContainer>
        <IDWrapper>
          <ID>#{instance.id}</ID>
        </IDWrapper>
      </Row>
      <WorkflowStepper
        currentStage={instance.current_stage}
        rejectedStage={instance.rejected_stage_order}
        items={instance.items}
        status={status}
      />
    </Card>
  );
}

export default WorkflowInstanceCard;
