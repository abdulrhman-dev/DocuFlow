import { useSearchParams } from "react-router-dom";

import Empty from "@components/Empty";
import Spinner from "@components/Spinner";
import Menus from "@components/Menu";
import Table from "@components/Table";
import Pagination from "@components/Pagination";
import RequestRow from "./RequestRow";

import useRequests from "../hooks/useRequests";
import { PAGE_SIZE } from "@utils/consts";

import { translator as t } from "@data/translations/ar";

function RequestsTable({ filter }) {
  const [searchParams] = useSearchParams();

  const status = searchParams.get("status") || "all";
  const sortBy = searchParams.get("sortBy") || "startDate-desc";

  const { isPending, data: requests } = useRequests({ filter, status, sortBy });

  if (isPending) return <Spinner />;
  if (!requests?.length) return <Empty resource={t.request.requests} />;

  const currentPage = Number(searchParams.get("page")) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedData = requests.slice(startIndex, endIndex);

  const isDraft = filter === "draft";
  // draft view: same columns as before.
  // submitted view: add a "Sent to" column between status and date.
  const columns = isDraft
    ? "0.6fr 2.4fr 1fr 2fr 2rem"
    : "0.6fr 2fr 1fr 2.4fr 2fr";

  return (
    <Menus>
      <Table columns={columns}>
        <Table.Header>
          <div>#</div>
          <div>{t.general.type}</div>
          <div>{t.general.status}</div>
          {!isDraft && <div>{t.request.sentTo}</div>}
          <div>{isDraft ? t.time.lastUpdated : t.time.sent}</div>
          {isDraft && <div></div>}
        </Table.Header>

        <Table.Body
          data={paginatedData}
          render={(request) => (
            <RequestRow
              key={request?.id}
              request={request}
              showRecipients={!isDraft}
            />
          )}
        />
        <Table.Footer>
          <Pagination numResults={requests?.length} />
        </Table.Footer>
      </Table>
    </Menus>
  );
}

export default RequestsTable;
