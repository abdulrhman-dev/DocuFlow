import styled, { css } from "styled-components";

const StepperContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin: 0 0 4rem 0;
  padding-top: 3rem;
  scale: 0.9;
`;

const Step = styled.div`
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.4rem;
  position: relative;
  z-index: 2;

  ${({ $state }) => {
    if ($state === "completed_all") {
      return css`
        background-color: var(--color-green-700);
        color: var(--color-grey-0);
        border: 3px solid var(--color-green-700);
      `;
    }
    if ($state === "rejected_here") {
      return css`
        background-color: var(--color-red-800);
        color: var(--color-grey-0);
        border: 3px solid var(--color-red-800);
      `;
    }
    if ($state === "rejected") {
      return css`
        background-color: var(--color-red-700);
        color: var(--color-grey-0);
        border: 3px solid var(--color-red-700);
      `;
    }
    if ($state === "active") {
      return css`
        background-color: var(--color-brand-600);
        color: var(--color-grey-0);
        border: 3px solid var(--color-brand-600);
      `;
    }
    if ($state === "completed") {
      return css`
        background-color: var(--color-brand-600);
        color: var(--color-grey-0);
        border: 3px solid var(--color-brand-600);
      `;
    }
    return css`
      background-color: var(--color-grey-0);
      color: var(--color-grey-400);
      border: 3px solid var(--color-grey-300);
    `;
  }}
`;

const StepConnector = styled.div`
  height: 3px;
  width: 9cqw;
  background-color: ${({ $state }) => {
    if ($state === "completed_all") {
      return "var(--color-green-700)";
    }

    if ($state === "completed") {
      return "var(--color-brand-600)";
    }

    if ($state === "rejected") {
      return "var(--color-red-700)";
    }

    return "var(--color-grey-200)";
  }
  };
  position: relative;
  z-index: 1;
`;

const Title = styled.span`
  display: inline-block;
  position: absolute;
  width: 10rem;
  top: 120%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  font-size: 1.3rem;
  color: ${({ $state }) =>
    $state === "rejected_here"
      ? "var(--color-red-700)"
      : "var(--color-grey-600)"};
  font-weight: ${({ $state }) => ($state === "rejected_here" ? 700 : 400)};
  line-height: 1.3;
`;

function ProgressStepper({
  currentStep = 1,
  rejectedStep = null,
  items = [],
  status = "in_progress",
}) {
  const totalSteps = items.length;


  return (
    <StepperContainer>
      {items.map((item, index) => {
        const stepNumber = index + 1;

        let stepState = "pending";
        let connectorState = "pending";

        if (status === "completed") {
          stepState = "completed_all";
          connectorState = "completed_all";
        } else if (status === "rejected") {
          const failedAt = Number(rejectedStep) || currentStep;
          if (stepNumber < failedAt) {
            stepState = "rejected";
            connectorState = "rejected";
          } else if (stepNumber === failedAt) {
            stepState = "rejected_here";
            connectorState = "pending";
          } else {
            stepState = "pending";
            connectorState = "pending";
          }
        } else {
          if (stepNumber === currentStep) stepState = "active";
          else if (stepNumber < currentStep) stepState = "completed";
          if (stepNumber < currentStep) connectorState = "completed";
        }

        return (
          <div
            key={stepNumber}
            style={{ display: "flex", alignItems: "center" }}
          >
            <div style={{ position: "relative" }}>
              <Step $state={stepState}>{stepNumber}</Step>
              <Title $state={stepState}>{item.title}</Title>
            </div>
            {stepNumber < totalSteps && (
              <StepConnector $state={connectorState} />
            )}
          </div>
        );
      })}
    </StepperContainer>
  );
}

export default ProgressStepper;
