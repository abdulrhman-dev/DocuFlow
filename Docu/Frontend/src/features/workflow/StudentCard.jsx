import styled from "styled-components";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    HiOutlineIdentification,
    HiOutlineAcademicCap,
    HiOutlineCalendar,
    HiOutlineHashtag,
    HiOutlineUser,
} from "react-icons/hi2";

import { translator as t } from "@data/translations/ar";

const Card = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.4rem 2rem;
  align-items: start;
  padding: 1.6rem 1.8rem;
  border-radius: var(--border-radius-md);
  background: linear-gradient(
    135deg,
    var(--color-brand-100, #eef) 0%,
    var(--color-grey-0) 55%
  );
  border: 1px solid var(--color-grey-200);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
`;

const Monogram = styled.div`
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: var(--color-brand-600);
  color: var(--color-grey-0);
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-self: center;
`;

const Name = styled.div`
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-grey-800);
`;

const Code = styled.div`
  color: var(--color-grey-500);
  font-size: 1.2rem;
`;

const Facts = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.6rem 1.6rem;
`;

const Fact = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 0.2rem;
  color: var(--color-grey-700);
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  & svg {
    width: 1.7rem;
    height: 1.7rem;
    color: var(--color-brand-600);
    flex-shrink: 0;
  }
`;

const Label = styled.span`
  color: var(--color-grey-500);
  margin-inline-end: 0.4rem;
`;

function initials(name) {
    const parts = (name || "").trim().split(/\s+/);
    const a = parts[0]?.charAt(0) || "";
    const b = parts[1]?.charAt(0) || "";
    return (a + b || "؟").toUpperCase();
}

function fmtDate(d) {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return format(date, "d MMMM yyyy", { locale: ar });
}

function fmtNumber(v) {
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
}

function StudentCard({ student }) {
    if (!student) return null;
    return (
        <Card>
            <Monogram>{initials(student.name)}</Monogram>
            <Header>
                <Name>
                    <HiOutlineUser style={{ verticalAlign: "middle", marginInlineEnd: "0.4rem" }} />
                    {student.name}
                </Name>
                <Code>#{student.code}</Code>
            </Header>

            <Facts>
                {student.nationalId && (
                    <Fact>
                        <HiOutlineIdentification />
                        <Label>{t.student.nationalId}:</Label>
                        {student.nationalId}
                    </Fact>
                )}
                <Fact>
                    <HiOutlineHashtag />
                    <Label>{t.student.creditHours}:</Label>
                    {fmtNumber(student.creditHours)}
                </Fact>
                <Fact>
                    <HiOutlineAcademicCap />
                    <Label>{t.student.gpa}:</Label>
                    {fmtNumber(student.gpa)}
                </Fact>
                <Fact>
                    <HiOutlineCalendar />
                    <Label>{t.student.registrationStart}:</Label>
                    {fmtDate(student.registrationStart)}
                </Fact>
                <Fact>
                    <HiOutlineCalendar />
                    <Label>{t.student.registrationEnd}:</Label>
                    {fmtDate(student.registrationEnd)}
                </Fact>
            </Facts>
        </Card>
    );
}

export default StudentCard;
