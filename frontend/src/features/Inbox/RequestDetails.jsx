import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";
import toast from "react-hot-toast";

import { RequestedDocsList } from "../request";
import RequestTag from "./RequestTag";
import Spinner from "@components/Spinner";
import ActionButtons from "@components/ActionButtons";
import TextArea from "@components/inputs/TextArea";
import Button from "@components/Button";
import { Avatar } from "@components/UserAvatar";
import Heading from "@components/Heading";
import Modal from "@components/Modal";

import useRequestData from "../request/hooks/useRequestData";
import { usePatchRequest } from "../request/hooks/usePatchRequest";
import { useUser } from "@features/user/hooks/useUser";
import { translator as t } from "@data/translations/ar";
import { getProfilePictureUrl } from "@features/user/utils";

const Container = styled.form`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 3rem;
`;

const StyledHeading = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-grey-200);
`;

const InlineFields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
  background-color: var(--color-grey-0);
  padding: 1.6rem;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 1.2rem;
  color: var(--color-grey-700);
`;

const Input = styled.input`
  padding: 0.8rem 1rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  color: var(--color-grey-800);
  font-size: 1.4rem;

  &:focus {
    outline: 2px solid var(--color-brand-600);
    outline-offset: -1px;
  }
`;

const ButtonsBox = styled.div`
  display: flex;
  gap: 1.2rem;
  align-items: center;
`;

const StatusMessage = styled.div`
  width: 100%;
  text-align: center;
  padding: 1.5rem;
  border-radius: var(--border-radius-md);
  font-size: 1.4rem;
  font-weight: 500;

  ${(props) =>
    props.$status === "approved" &&
    `
    background-color: var(--color-green-100);
    color: var(--color-green-700);
    border: 1px solid var(--color-green-200);
  `}

  ${(props) =>
    props.$status === "rejected" &&
    `
    background-color: var(--color-red-100);
    color: var(--color-red-700);
    border: 1px solid var(--color-red-200);
  `}
`;

const RequestId = styled.div`
  color: var(--color-grey-400);
  font-size: 1.2rem;
  margin-bottom: 2rem;
`;

const UserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin: 2.5rem 0;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-weight: 600;
  color: var(--color-grey-800);
`;

const UserDate = styled.div`
  color: var(--color-grey-500);
  font-size: 1.1rem;
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80vh;
`;

function RequestDetails() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request");
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const { patchRequest, isPending: isResponding } = usePatchRequest(requestId);
  const { request, isPending: isLoadingRequest } = useRequestData({
    requestId,
  });

  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");


  const isManager = currentUser?.role === "department_manager";

  function validateManagerFields() {
    if (!isManager) return true;
    const y = Number.parseInt(year, 10);
    const m = Number.parseInt(month, 10);
    if (!Number.isInteger(y) || y < 1900 || y > 3000) {
      toast.error(t.request.yearRequired);
      return false;
    }
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      toast.error(t.request.monthRange);
      return false;
    }
    return true;
  }

  function buildManagerPayload() {
    if (!isManager) return {};
    return {
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10),
    };
  }

  function handleApprove() {
    if (!validateManagerFields()) return;
    patchRequest(
      {
        id: request.id,
        request: { status: "approved", ...buildManagerPayload() },
      },
      {
        onSuccess: (response) => {
          const updated = response?.request || response;
          const nd = updated?.nextDraft;
          if (
            nd &&
            nd.requestId &&
            nd.instanceId &&
            nd.workflowId &&
            currentUser?.id &&
            nd.userId === currentUser.id
          ) {
            navigate(
              `/workflows/${nd.workflowId}/instances/${nd.instanceId}/request/${nd.requestId}`,
            );
          }
        },

      },
    );
  }

  function handleReject(rejectionReason) {
    if (!validateManagerFields()) return;
    patchRequest({
      id: request.id,
      request: {
        status: "rejected",
        rejectionReason,
        ...buildManagerPayload(),
      },
    });
  }

  const isPending = request?.status === "pending" || !request?.status;

  if (!searchParams.get("request"))
    return <Empty>{t.request.clickRequest}</Empty>;
  if (isLoadingRequest) return <Spinner />;

  return (
    <Container onSubmit={(e) => e.preventDefault()}>
      <Content>
        <StyledHeading>
          <Heading as="h1">request for Supervision</Heading>
          <RequestTag status={request.status} />
        </StyledHeading>

        <RequestId>#{request?.id}</RequestId>
        <UserRow>
          <Avatar src={getProfilePictureUrl(request?.user?.profilePicture)} />
          <UserInfo>
            <UserName>{`${request.user.firstName} ${request.user.lastName}`}</UserName>
            <UserDate>
              {t.time.on}{" "}
              {format(new Date(request.sentAt), "EEEE d MMMM yyyy, h:mm a", {
                locale: ar,
              })}
            </UserDate>
          </UserInfo>
        </UserRow>

        <RequestedDocsList
          type="documents"
          mode="view"
          documents={request.documents}
        />

        <Heading as="h3">{t.request.note}</Heading>
        <TextArea
          value={request?.note || t.request.noNote}
          placeholder={t.request.noNote}
          rows={4}
          readOnly
        />
      </Content>

      <Footer>
        {isPending ? (
          <>
            {isManager && (
              <InlineFields>
                <Field>
                  <span>{t.request.year}</span>
                  <Input
                    type="number"
                    min={1900}
                    max={3000}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2025"
                  />
                </Field>
                <Field>
                  <span>{t.request.month}</span>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="1-12"
                  />
                </Field>
              </InlineFields>
            )}

            <RequestActionButtons
              onSave={handleApprove}
              onCancel={handleReject}
              isResponding={isResponding}
            />
          </>
        ) : (
          <StatusMessage $status={request?.status}>
            {t.request[request?.status]}
          </StatusMessage>
        )}
      </Footer>
    </Container>
  );
}

const RejectionButtonsBox = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: flex-start;
  gap: 1.2rem;
`;

function RequestActionButtons({ onCancel, onSave, isResponding }) {
  return (
    <RejectionButtonsBox>
      <Button
        loading={isResponding}
        $variation="primary"
        onClick={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        {t.actions.approve}
      </Button>
      <Modal>
        <Modal.Open opens={"request-rejection"}>
          <Button loading={isResponding} $variation={"danger"} type="button">
            {t.actions.reject}
          </Button>
        </Modal.Open>
        <Modal.Window name="request-rejection">
          <RejectionWindow handleReject={onCancel} isResponding={isResponding} />
        </Modal.Window>
      </Modal>
    </RejectionButtonsBox>
  );
}

const RejectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding-right: 1rem;
  gap: 2rem;
  width: 50rem;
  transition: width 0.3s;
`;

function RejectionWindow({ onClose, handleReject, isResponding }) {
  const [rejectionText, setRejectionText] = useState("");

  const handleChange = (e) => {
    setRejectionText(e.target.value);
  };

  return (
    <RejectionContainer>
      <TextArea
        value={rejectionText}
        placeholder={t.request.rejectionReason}
        onChange={handleChange}
        rows={2}
      />
      <ActionButtons
        onCancel={() => onClose()}
        onSave={() => {
          handleReject(rejectionText);
          onClose?.();
        }}
        textCancel={t.actions.cancel}
        textSave={t.actions.reject}
        isCancelDanger={false}
        isApproveDanger={true}
        isSaving={isResponding}
      />
    </RejectionContainer>
  );
}

export default RequestDetails;
