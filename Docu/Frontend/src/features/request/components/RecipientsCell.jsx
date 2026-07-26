import styled from "styled-components";
import { Avatar } from "@components/UserAvatar";
import { getProfilePictureUrl } from "@features/user/utils";
import { translator as t } from "@data/translations/ar";

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
`;

const Stack = styled.div`
  display: flex;
  align-items: center;

  & > * + * {
    margin-inline-start: -0.8rem;
  }
`;

const AvatarSlot = styled.div`
  position: relative;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 50%;
  border: 2px solid var(--color-grey-0);
  overflow: visible;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
  }
`;

const StatusDot = styled.span`
  position: absolute;
  bottom: -1px;
  inset-inline-end: -1px;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  border: 2px solid var(--color-grey-0);
  background-color: ${({ $status }) =>
        $status === "approved"
            ? "var(--color-green-700)"
            : $status === "rejected"
                ? "var(--color-red-700)"
                : "var(--color-grey-400)"};
`;

const MoreBubble = styled.div`
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 50%;
  border: 2px solid var(--color-grey-0);
  background-color: var(--color-grey-200);
  color: var(--color-grey-700);
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Summary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`;

const SummaryLine = styled.div`
  font-size: 1.2rem;
  color: var(--color-grey-700);
  white-space: nowrap;
`;

const CountersLine = styled.div`
  display: flex;
  gap: 0.6rem;
  font-size: 1.1rem;
`;

const Counter = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.6rem;
  border-radius: 999px;
  background-color: ${({ $type }) =>
        $type === "approved"
            ? "var(--color-green-100)"
            : $type === "rejected"
                ? "var(--color-red-100)"
                : "var(--color-grey-100)"};
  color: ${({ $type }) =>
        $type === "approved"
            ? "var(--color-green-700)"
            : $type === "rejected"
                ? "var(--color-red-700)"
                : "var(--color-grey-600)"};
  font-weight: 600;
`;

const MAX_VISIBLE = 3;

function initials(u) {
    const a = (u?.firstName || "").trim().charAt(0);
    const b = (u?.lastName || "").trim().charAt(0);
    return (a + b || "?").toUpperCase();
}

function fullName(u) {
    return [u?.firstName, u?.lastName].filter(Boolean).join(" ");
}

function tooltipFor(r) {
    const name = fullName(r) || "—";
    const status = r.status || "pending";
    return `${name} — ${status}`;
}

function RecipientsCell({ recipients = [], summary }) {
    const total = summary?.total ?? recipients.length;
    const approved = summary?.approved ?? 0;
    const rejected = summary?.rejected ?? 0;
    const responded = summary?.responded ?? approved + rejected;

    if (total === 0) {
        return <SummaryLine>{t.request.noRecipients}</SummaryLine>;
    }

    const visible = recipients.slice(0, MAX_VISIBLE);
    const overflow = total - visible.length;

    return (
        <Wrapper>
            <Stack>
                {visible.map((r) => (
                    <AvatarSlot key={r.userId} title={tooltipFor(r)}>
                        {r.profilePicture ? (
                            <Avatar src={getProfilePictureUrl(r.profilePicture)} />
                        ) : (
                            <MoreBubble>{initials(r)}</MoreBubble>
                        )}
                        <StatusDot $status={r.status} />
                    </AvatarSlot>
                ))}
                {overflow > 0 && (
                    <MoreBubble title={t.request.moreCount(overflow)}>
                        {t.request.moreCount(overflow)}
                    </MoreBubble>
                )}
            </Stack>

            <Summary>
                <SummaryLine>
                    {t.request.responded}: {responded} / {total}
                </SummaryLine>
                <CountersLine>
                    {approved > 0 && (
                        <Counter $type="approved">
                            {t.status.approved} · {approved}
                        </Counter>
                    )}
                    {rejected > 0 && (
                        <Counter $type="rejected">
                            {t.status.rejected} · {rejected}
                        </Counter>
                    )}
                    {total - responded > 0 && (
                        <Counter $type="pending">
                            {t.status.pending} · {total - responded}
                        </Counter>
                    )}
                </CountersLine>
            </Summary>
        </Wrapper>
    );
}

export default RecipientsCell;
