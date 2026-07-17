import ProgressStepper from "@components/ProgressStepper";

function WorkflowStepper({
  currentStage = 0,
  rejectedStage = null,
  items = [],
  status = "in_progress",
}) {
  return (
    <ProgressStepper
      currentStep={currentStage}
      rejectedStep={rejectedStage}
      items={items}
      status={status}
    />
  );
}

export default WorkflowStepper;
