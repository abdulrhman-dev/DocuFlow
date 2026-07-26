import styled from "styled-components";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    HiOutlineAcademicCap,
    HiOutlineBuildingLibrary,
    HiOutlineCalendar,
    HiOutlineHashtag,
    HiOutlineUser,
    HiOutlineUsers,
    HiOutlineXMark,
} from "react-icons/hi2";

import { translator as t } from "@data/translations/ar";

const Card = styled.article`
  position: relative;
  padding: 1.6rem 1.8rem;
  border-radius: var(--border-radius-md);
  background: linear-gradient(
    135deg,
    var(--color-brand-100, #eef) 0%,
    var(--color-grey-0) 55%
  );
  border: 1px solid var(--color-grey-200);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const Title = styled.div`
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-grey-800);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  & svg {
    width: 1.9rem;
    height: 1.9rem;
    color: var(--color-brand-600);
  }
`;

const RemoveBtn = styled.button`
  border: none;
  background: var(--color-grey-100);
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

const Facts = styled.div`
  display:  flex;
  justify-content: space-between;
  align-items: start;
`;

const Fact = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-grey-700);
  font-size: 1.25rem;
  & svg {
    width: 1.6rem;
    height: 1.6rem;
    color: var(--color-brand-600);
    flex-shrink: 0;
  }
`;

const Label = styled.span`
  color: var(--color-grey-500);
  margin-inline-end: 0.4rem;
`;

const ProfList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ProfChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  background: var(--color-grey-0);
  color: var(--color-grey-700);
  font-size: 1.2rem;
  border: 1px solid var(--color-grey-200);
`;

function fmt(d) {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return format(date, "d MMMM yyyy", { locale: ar });
}

function DirectorInstanceCard({ instance, onRemove }) {
    if (!instance) return null;


    const additionalProfs = (instance.professors || [])
        .map((ip) => ip?.user)
        .filter(Boolean);
    const profs = [instance.user, ...additionalProfs];



    return (
        <Card>
            <HeaderRow>
                <Title>
                    <HiOutlineAcademicCap />
                    #{instance.id} {instance.workflow?.title} — {instance.student?.name || instance.studentId} ({instance.student?.code})
                </Title>
                {onRemove && (
                    <RemoveBtn
                        type="button"
                        title={t.actions.delete}
                        aria-label={t.actions.delete}
                        onClick={() => onRemove(instance.id)}
                    >
                        <HiOutlineXMark />
                    </RemoveBtn>
                )}
            </HeaderRow>


            {profs.length > 0 && (
                <div>
                    <Fact style={{ marginBottom: "0.5rem" }}>
                        <HiOutlineUsers />
                        <Label>{t.workflow.supervisors}:</Label>
                    </Fact>
                    <ProfList>
                        {profs.map((p) => (
                            <ProfChip key={p.id}>
                                {p.firstName} {p.lastName}
                            </ProfChip>
                        ))}
                    </ProfList>
                </div>
            )}
        </Card>
    );
}

export default DirectorInstanceCard;
