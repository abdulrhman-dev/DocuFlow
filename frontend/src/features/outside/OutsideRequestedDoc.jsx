import styled from "styled-components";
import { HiDocumentText, HiClipboardDocumentList } from "react-icons/hi2";

import Modal from "@components/Modal";
import OutsideDocumentPreview from "./OutsideDocumentPreview";
import { translator as t } from "@data/translations/ar";

const ItemCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
  border: 2px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  background-color: var(--color-grey-0);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;

  &:hover {
    border-color: var(--color-brand-600);
    background-color: var(--color-grey-50);
  }
`;

const ItemIcon = styled.div`
  width: 6.8rem;
  height: 6.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);

  & svg {
    width: 2.4rem;
    height: 2.4rem;
    color: var(--color-grey-600);
  }
`;

const ItemLabel = styled.span`
  font-size: 1.25rem;
  color: var(--color-grey-700);
  text-align: center;
`;

function OutsideRequestedDoc({ token, doc: { name, id }, type }) {
    return (
        <Modal>
            <Modal.Open opens={`outside-preview-${id}`}>
                <ItemCard>
                    <ItemIcon>
                        {type === "form" ? <HiClipboardDocumentList /> : <HiDocumentText />}
                    </ItemIcon>
                    <ItemLabel>{name || `${t.documents.document} #${id}`}</ItemLabel>
                </ItemCard>
            </Modal.Open>
            <Modal.Window name={`outside-preview-${id}`} width="80%">
                <OutsideDocumentPreview token={token} docId={id} />
            </Modal.Window>
        </Modal>
    );
}

export default OutsideRequestedDoc;
