import { useState } from "react";
import styled from "styled-components";

import Heading from "@components/Heading";
import Spinner from "@components/Spinner";
import Empty from "@components/Empty";
import CompletedInstanceCard from "@features/dean/CompletedInstanceCard";
import { useCompletedInstances } from "@features/dean/hooks/useDeanInstances";
import { translator as t } from "@data/translations/ar";

const Page = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  direction: rtl;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.8rem;
`;

const Tab = styled.button`
  border: 1px solid var(--color-grey-200);
  background: ${({ $active }) =>
        $active ? "var(--color-brand-600)" : "var(--color-grey-0)"};
  color: ${({ $active }) =>
        $active ? "var(--color-grey-0)" : "var(--color-grey-700)"};
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
`;

function CompletedInstances() {
    const [include, setInclude] = useState("pending");
    const { instances, isPending } = useCompletedInstances({ include });

    return (
        <Page>
            <HeaderRow>
                <Heading as="h1">{t.dean.inbox}</Heading>
                <Tabs>
                    <Tab
                        $active={include === "pending"}
                        onClick={() => setInclude("pending")}
                    >
                        {t.dean.tabPending}
                    </Tab>
                    <Tab
                        $active={include === "all"}
                        onClick={() => setInclude("all")}
                    >
                        {t.dean.tabAll}
                    </Tab>
                </Tabs>
            </HeaderRow>

            {isPending ? (
                <Spinner />
            ) : instances.length === 0 ? (
                <Empty resource={t.dean.inbox} />
            ) : (
                instances.map((i) => (
                    <CompletedInstanceCard key={i.id} instance={i} />
                ))
            )}
        </Page>
    );
}

export default CompletedInstances;
