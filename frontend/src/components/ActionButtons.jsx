import Button from "@components/Button";
import styled from "styled-components";

const ButtonsBox = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: flex-start;
  gap: 1.2rem;
`;

function ActionButtons({
  onCancel,
  onSave,
  isCancelDanger = true,
  textSave = "save",
  textCancel = "cancel",
}) {
  return (
    <ButtonsBox>
      <Button $variation="primary" onClick={(e) => {
        e.preventDefault();
        onSave()
      }}>
        {textSave}
      </Button>
      <Button
        $variation={isCancelDanger === true ? "danger" : "secondary"}
        onClick={(e) => {
          e.preventDefault();
          onCancel();
        }}
      >
        {textCancel}
      </Button>
    </ButtonsBox>
  );
}

export default ActionButtons;
