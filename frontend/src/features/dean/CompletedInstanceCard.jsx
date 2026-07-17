import styled, { css } from "styled-components";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { HiCheckCircle, HiXCircle, HiClock } from "react-icons/hi2";
import { translator as t } from "@data/translations/ar";

const Card = styled.button`
  all: unset;
  cursor: pointer;
  padding: 1.6rem 2rem;
  margin-bottom: 1.5rem;
  width: 100%;
  background: var(--color-grey-0);
  border-radius: 12px;
  border: 1px solid var(--color-grey-200);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  direction: rtl;
  display: flex;
  align-items: center;
  gap: 1.6rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  }

  ${({ $status }) =>
        $status === "executed" &&
        css`
      border-left: 6px solid var(--color-green-700);
    `}
  ${({ $status }) =>
        $status === "rejected" &&
        css`
      border-left: 6px solid var(--color-red-700);
    `}
  ${({ $status }) =>
        $status === "completed" &&
        css`
      border-left: 6px solid var(--color-brand-600);
    `}
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const Title = styled.span`
  font-weight: 700;
  font-size: 1.8rem;
  color: var(--color-grey-800);
`;

const Sub = styled.span`
  color: var(--color-grey-500);
  font-size: 1.3rem;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 1.25rem;
  font-weight: 600;

  ${({ $status }) =>
        $status === "executed" &&
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
        $status === "completed" &&
        css`
      background: var(--color-brand-100, #eef);
      color: var(--color-brand-700, #333);
    `}
`;

function statusIcon(status) {
    if (status === "executed") return <HiCheckCircle />;
    if (status === "rejected") return <HiXCircle />;
    return <HiClock />;
}

function statusLabel(status) {
    if (status === "executed") return t.status.executed;
    if (status === "rejected") return t.status.rejected;
    return t.status.completed;
}

function CompletedInstanceCard({ instance }) {
    const navigate = useNavigate();
    const status = instance.status;
    const studentName = instance.student?.name || "";
    const workflowTitle = instance.workflow?.title || "";
    const dept = instance.department?.name || "";
    const when = instance.updatedAt || instance.createdAt;

    return (
        <Card
            $status={status}
            onClick={() => navigate(`/dean/completed/${instance.id}`)}
        >
            <Main>
                <Title>
                    {workflowTitle} — {studentName}
                </Title>
                <Sub>
                    {dept} · #{instance.id} ·{" "}
                    {when
                        ? format(new Date(when), "EEEE d MMMM yyyy, h:mm a", { locale: ar })
                        : ""}
                </Sub>
            </Main>
            <Badge $status={status}>
                {statusIcon(status)}
                {statusLabel(status)}
            </Badge>
        </Card>
    );
}

export default CompletedInstanceCard;
