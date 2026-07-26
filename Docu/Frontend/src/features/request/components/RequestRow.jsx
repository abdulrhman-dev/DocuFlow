import styled from "styled-components";
import { HiTrash } from "react-icons/hi2";
import { CiEdit } from "react-icons/ci";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ar } from "date-fns/locale";

import Modal from "@components/Modal";
import Menus from "@components/Menu";
import Table from "@components/Table";
import Tag from "@components/Tag";
import ConfirmDelete from "@components/ConfirmDelete";
import { useAllWorkflows } from "@features/workflow";
import { useDeleteRequest } from "../hooks/useDeleteRequest";
import RecipientsCell from "./RecipientsCell";

import { translator as t } from "@data/translations/ar";

const Note = styled.div`
  font-size: 1.4rem;
  color: var(--color-grey-700);
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  & span:first-child {
    font-weight: 500;
  }
  & span:last-child {
    color: var(--color-grey-500);
    font-size: 1.2rem;
  }
`;

function RequestRow({ request, showRecipients = false }) {
  const {
    id,
    workflowTitle,
    status,
    sentAt,
    updatedAt,
    instanceId,
    recipients = [],
    recipientsSummary,
  } = request;

  const navigate = useNavigate();
  const { data: workflows } = useAllWorkflows();
  const { deleteRequest, isPending: isDeleting } = useDeleteRequest();

  const statusToTag = {
    pending: "blue",
    draft: "yellow",
    rejected: "red",
    approved: "green",
  };

  const workflowId = workflows?.find((w) => w.title === workflowTitle)?.id;
  const dateToDisplay = status === "draft" ? updatedAt : sentAt;

  function handleEditRequest() {
    navigate(`/workflows/${workflowId}/instances/${instanceId}/request/${id}`);
  }

  return (
    <Table.Row>
      <p>{id}</p>
      <Note>{workflowTitle}</Note>

      <Tag $type={statusToTag[status]}>{t.status[status]}</Tag>

      {showRecipients && (
        <RecipientsCell
          recipients={recipients}
          summary={recipientsSummary}
        />
      )}

      <Info>
        <span>
          {formatDistanceToNow(new Date(dateToDisplay), {
            addSuffix: true,
            locale: ar,
          })}
        </span>
        <span>
          {format(new Date(dateToDisplay), "EEEE d MMMM yyyy, h:mm a", {
            locale: ar,
          })}
        </span>
      </Info>

      {status === "draft" && (
        <Modal>
          <Menus.Menu>
            <Menus.Toggle id={id} />
            <Menus.List id={id}>
              <Menus.Button onClick={handleEditRequest} icon={<CiEdit />}>
                {t.actions.editRequest}
              </Menus.Button>

              <Modal.Open opens={`delete-request-${id}`}>
                <Menus.Button icon={<HiTrash />}>
                  {t.actions.deleteRequest}
                </Menus.Button>
              </Modal.Open>
            </Menus.List>
          </Menus.Menu>

          <Modal.Window name={`delete-request-${id}`}>
            <ConfirmDelete
              resourceName={t.request.request}
              disabled={isDeleting}
              onConfirm={(close) => deleteRequest({ id }, { onSuccess: close })}
            />
          </Modal.Window>
        </Modal>
      )}
    </Table.Row>
  );
}

export default RequestRow;
