import styled, { css } from "styled-components";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlinePrinter,
  HiOutlineEye,
} from "react-icons/hi2";
import { translator as t } from "@data/translations/ar";

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 1.4rem 1.6rem;
  margin-bottom: 1rem;
  background: var(--color-grey-0);
  border-radius: 10px;
  border: 1px solid var(--color-grey-200);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  direction: rtl;

  ${({ $status }) =>
    $status === "approved" &&
    css`border-inline-start: 5px solid var(--color-green-700);`}
  ${({ $status }) =>
    $status === "rejected" &&
    css`border-inline-start: 5px solid var(--color-red-700);`}
  ${({ $status }) =>
    $status === "printed" &&
    css`border-inline-start: 5px solid var(--color-blue-700);`}
  ${({ $status }) =>
    $status === "completed" &&
    css`border-inline-start: 5px solid var(--color-brand-600);`}
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  padding: 0.4rem;
`;

const Check = styled.input.attrs({ type: "checkbox" })`
  width: 1.8rem;
  height: 1.8rem;
  cursor: pointer;
  accent-color: var(--color-brand-600);
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
`;

const Title = styled.span`
  font-weight: 700;
  font-size: 1.65rem;
  color: var(--color-grey-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Sub = styled.span`
  color: var(--color-grey-500);
  font-size: 1.25rem;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-size: 1.2rem;
  font-weight: 600;

  ${({ $s }) =>
    $s === "approved" &&
    css`background: var(--color-green-100); color: var(--color-green-700);`}
  ${({ $s }) =>
    $s === "rejected" &&
    css`background: var(--color-red-100); color: var(--color-red-700);`}
  ${({ $s }) =>
    $s === "printed" &&
    css`background: var(--color-blue-100, #dbeafe); color: var(--color-blue-700);`}
  ${({ $s }) =>
    $s === "completed" &&
    css`background: var(--color-brand-100, #eef); color: var(--color-brand-700, #333);`}
`;

const EyeButton = styled.button`
  border: 1px solid var(--color-grey-200);
  background: var(--color-grey-0);
  color: var(--color-grey-600);
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease,
    box-shadow 0.15s ease;

  & svg {
    width: 2rem;
    height: 2rem;
  }

  &:hover {
    background: var(--color-brand-600);
    color: var(--color-grey-0);
    border-color: var(--color-brand-600);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  &:focus-visible {
    outline: 3px solid rgba(79, 70, 229, 0.35);
    outline-offset: 2px;
  }
`;

function icon(s) {
  if (s === "approved") return <HiOutlineCheckCircle />;
  if (s === "rejected") return <HiOutlineXCircle />;
  if (s === "printed") return <HiOutlinePrinter />;
  return <HiOutlineClock />;
}

function label(s) {
  if (s === "approved") return t.status.approved;
  if (s === "rejected") return t.status.rejected;
  if (s === "printed") return t.status.printed;
  return t.status.completed;
}

function AffairsInstanceCard({ instance, checked, onToggle }) {
  const navigate = useNavigate();
  const status = instance.status;
  const when = instance.updatedAt || instance.createdAt;

  return (
    <Row $status={status}>
      <CheckLabel
        aria-label="select"
        onClick={(e) => e.stopPropagation()}
      >
        <Check
          checked={!!checked}
          onChange={() => onToggle(instance.id)}
        />
      </CheckLabel>

      <Main>
        <Title>
          {instance.workflow?.title} — {instance.student?.name || instance.studentId}
        </Title>
        <Sub>
          {instance.department?.name} · #{instance.id} ·{" "}
          {when
            ? format(new Date(when), "EEEE d MMMM yyyy, h:mm a", { locale: ar })
            : ""}
        </Sub>
      </Main>

      <Badge $s={status}>
        {icon(status)}
        {label(status)}
      </Badge>

      <EyeButton
        type="button"
        title={t.affairs.viewDetails}
        aria-label={t.affairs.viewDetails}
        onClick={() => navigate(`/affairs/completed/${instance.id}`)}
      >
        <HiOutlineEye />
      </EyeButton>
    </Row>
  );
}

export default AffairsInstanceCard;
