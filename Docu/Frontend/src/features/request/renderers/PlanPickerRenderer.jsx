import { useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { rankWith, and, isControl, uiTypeIs } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { HiCheckCircle, HiChevronLeft, HiChevronRight } from "react-icons/hi2";

import Spinner from "@components/Spinner";
import { usePlanForDepartment } from "../hooks/usePlan";
import useDocData from "../hooks/useDocData";
import { translator as t } from "@data/translations/ar";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1.2rem;
  background: var(--color-grey-50);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  max-height: 35rem;

`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const HeaderMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  & > span:first-child {
    font-size: 1.15rem;
    color: var(--color-grey-500);
  }
  & > span:last-child {
    font-weight: 700;
    color: var(--color-grey-800);
  }
`;

const StepChip = styled.span`
  padding: 0.4rem 0.9rem;
  background: var(--color-brand-100, #eef);
  color: var(--color-brand-700, #333);
  border-radius: 999px;
  font-size: 1.15rem;
  font-weight: 600;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  gap: 1rem;
  padding: 1rem;

  overflow-y:auto;
`;

const cardBase = css`
  padding: 1.2rem;
  border-radius: 10px;
  background: var(--color-grey-0);
  border: 1.5px solid var(--color-grey-200);
  cursor: pointer;
  text-align: start;
  transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 8rem;

  &:hover {
    border-color: var(--color-brand-600);
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
  }
`;

const AxisCard = styled.button.attrs({ type: "button" })`
  all: unset;
  ${cardBase}

  ${({ $selected }) =>
        $selected &&
        css`
      border-color: var(--color-brand-600);
      background: var(--color-brand-100, #eef);
    `}
`;

const AxisCode = styled.span`
  font-size: 1.1rem;
  color: var(--color-grey-500);
`;
const AxisName = styled.span`
  font-weight: 700;
  color: var(--color-grey-800);
  font-size: 1.5rem;
  line-height: 1.4;
`;

const GoalCard = styled.button.attrs({ type: "button" })`
  all: unset;
  ${cardBase}
  min-height: 10rem;
  position: relative;

  ${({ $selected }) =>
        $selected &&
        css`
      border-color: var(--color-green-700);
      background: var(--color-green-100);
    `}
`;

const GoalCode = styled.span`
  font-size: 1.1rem;
  color: var(--color-grey-500);
`;
const GoalName = styled.span`
  color: var(--color-grey-800);
  font-size: 1.35rem;
  line-height: 1.55;
`;

const CheckBadge = styled.span`
  position: absolute;
  top: 0.6rem;
  inset-inline-end: 0.6rem;
  color: var(--color-green-700);
  display: inline-flex;

  & svg {
    width: 1.8rem;
    height: 1.8rem;
  }
`;

const BackBtn = styled.button.attrs({ type: "button" })`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-brand-700, #333);
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }

  & svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

const Empty = styled.div`
  color: var(--color-grey-500);
  padding: 1.2rem;
  text-align: center;
`;

const Summary = styled.div`
  padding: 0.8rem 1rem;
  background: var(--color-grey-0);
  border: 1px dashed var(--color-grey-300);
  border-radius: 8px;
  font-size: 1.25rem;
  color: var(--color-grey-700);

  & strong {
    color: var(--color-grey-800);
  }
`;

function PlanPicker({ data, handleChange, path, id, enabled = true, schema, uischema }) {
    // JsonForms passes the docId indirectly via useDocData in Form.jsx; we can
    // read it back from the form's outer state by looking at the containing
    // "form" props. Easiest is to read the instance's departmentId from the
    // form's `data.department` — we don't have it here. Instead we lift the
    // department via a small trick: JsonForms' schema exposes root data through
    // a document reference we already have. Simplest: read it from the doc.
    //
    // We use useDocData with the id from the closest form; that id lives on
    // window.__docFormId (set by Form.jsx when it mounts). This avoids threading
    // extra context through every renderer.
    const docId = typeof window !== "undefined" ? window.__docFormId : null;
    const { doc } = useDocData({ docId });

    // `doc.instance.departmentId` is loaded when the request/doc endpoint
    // returns it. If it's not there, fall back to reading from doc.data.
    const departmentId =
        doc?.instance?.departmentId ??
        doc?.departmentId ??
        null;

    const { axes, isPending } = usePlanForDepartment(departmentId);

    const value = data && typeof data === "object" ? data : {};
    const [selectedAxis, setSelectedAxis] = useState(value.axisCode || null);

    useEffect(() => {
        if (value.axisCode && value.axisCode !== selectedAxis) {
            setSelectedAxis(value.axisCode);
        }
    }, [value.axisCode]); // eslint-disable-line react-hooks/exhaustive-deps

    const currentAxis = useMemo(
        () => axes.find((a) => a.code === selectedAxis) || null,
        [axes, selectedAxis],
    );

    function pickAxis(axisCode) {
        setSelectedAxis(axisCode);
        // If switching to a different axis, clear the goal.
        if (axisCode !== value.axisCode) {
            handleChange(path, { axisCode, goalCode: "" });
        }
    }

    function pickGoal(goalCode) {
        handleChange(path, { axisCode: selectedAxis, goalCode });
    }

    function clearAxis() {
        setSelectedAxis(null);
        handleChange(path, { axisCode: "", goalCode: "" });
    }

    const selectedAxisObj = axes.find((a) => a.code === value.axisCode);
    const selectedGoalObj = selectedAxisObj?.goals.find(
        (g) => g.code === value.goalCode,
    );

    if (!departmentId) {
        return (
            <Wrapper>
                <Empty>{t.plan.noDepartment}</Empty>
            </Wrapper>
        );
    }
    if (isPending) {
        return (
            <Wrapper>
                <Spinner />
            </Wrapper>
        );
    }
    if (!axes.length) {
        return (
            <Wrapper>
                <Empty>{t.plan.noAxes}</Empty>
            </Wrapper>
        );
    }

    return (
        <Wrapper id={id}>
            <Header>
                <HeaderMain>
                    <span>{uischema?.label || schema?.title || t.plan.title}</span>
                    <span>
                        {currentAxis
                            ? `${t.plan.stepGoal} — ${currentAxis.name}`
                            : t.plan.stepAxis}
                    </span>
                </HeaderMain>
                <StepChip>{currentAxis ? "2 / 2" : "1 / 2"}</StepChip>
            </Header>

            {value.axisCode && value.goalCode && (
                <Summary>
                    <strong>{t.plan.selected}:</strong>{" "}
                    {selectedAxisObj?.name} — {selectedGoalObj?.name}
                </Summary>
            )}

            {!currentAxis ? (
                <Grid>
                    {axes.map((a) => (
                        <AxisCard
                            key={a.code}
                            $selected={a.code === value.axisCode}
                            disabled={!enabled}
                            onClick={() => pickAxis(a.code)}
                        >
                            <AxisCode>{a.code}</AxisCode>
                            <AxisName>{a.name}</AxisName>
                        </AxisCard>
                    ))}
                </Grid>
            ) : (
                <>
                    <BackBtn onClick={clearAxis} disabled={!enabled}>
                        <HiChevronRight />
                        {t.plan.backToAxes}
                    </BackBtn>
                    <Grid>
                        {currentAxis.goals.map((g) => {
                            const selected =
                                value.axisCode === currentAxis.code && value.goalCode === g.code;
                            return (
                                <GoalCard
                                    key={g.code}
                                    $selected={selected}
                                    disabled={!enabled}
                                    onClick={() => pickGoal(g.code)}
                                >
                                    {selected && (
                                        <CheckBadge>
                                            <HiCheckCircle />
                                        </CheckBadge>
                                    )}
                                    <GoalCode>{g.code}</GoalCode>
                                    <GoalName>{g.name}</GoalName>
                                </GoalCard>
                            );
                        })}
                    </Grid>
                </>
            )}
        </Wrapper>
    );
}

// --------- Tester: match when uischema.options.customRenderer === "planPicker" ---------
export const PlanPickerTester = rankWith(
    100,
    and(isControl, (uischema) => uischema?.options?.customRenderer === "planPicker"),
);

export default withJsonFormsControlProps(PlanPicker);
