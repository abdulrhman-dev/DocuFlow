import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { HiOutlinePrinter } from "react-icons/hi2";

import Heading from "@components/Heading";
import Spinner from "@components/Spinner";
import Empty from "@components/Empty";
import Button from "@components/Button";
import AffairsInstanceCard from "@features/affairs/AffairsInstanceCard";
import { useAffairsInstances } from "@features/affairs/hooks/useAffairs";
import {
    fetchBulkMergedPdfUrl,
    printPdfBlobUrl,
} from "@features/affairs/services/affairs";
import { useAllWorkflows } from "@features/workflow/hooks/useAllWorkflows";
import { translator as t } from "@data/translations/ar";

const Page = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  direction: rtl;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  flex-wrap: wrap;
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.4rem;
  background: var(--color-grey-50);
  border-radius: 10px;
  border: 1px solid var(--color-grey-200);
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const Tab = styled.button`
  border: 1px solid var(--color-grey-200);
  background: ${({ $active }) =>
        $active ? "var(--color-brand-600)" : "var(--color-grey-0)"};
  color: ${({ $active }) =>
        $active ? "var(--color-grey-0)" : "var(--color-grey-700)"};
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.3rem;
`;

const Select = styled.select`
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-grey-300);
  background: var(--color-grey-0);
  font-size: 1.35rem;
`;

const SelectAllWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--color-grey-200);
  background: var(--color-grey-0);
  cursor: pointer;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--color-grey-700);
  user-select: none;

  & input {
    width: 1.6rem;
    height: 1.6rem;
    cursor: pointer;
    accent-color: var(--color-brand-600);
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const STATUS_TABS = [
    { key: "completed", label: t.affairs.tabCompleted },
    { key: "printed", label: t.affairs.tabPrinted },
    { key: "approved", label: t.affairs.tabApproved },
    { key: "rejected", label: t.affairs.tabRejected },
];

function AffairsCompletedInstances() {
    const qc = useQueryClient();
    const [status, setStatus] = useState("completed");
    const [workflowId, setWorkflowId] = useState("");
    const [checked, setChecked] = useState(new Set());
    const [isPrintingBundle, setIsPrintingBundle] = useState(false);

    const filters = useMemo(
        () => ({ status, workflowId: workflowId || undefined }),
        [status, workflowId],
    );
    const { instances, isPending } = useAffairsInstances(filters);

    // `useAllWorkflows` returns { data, isPending }
    const workflowsResult = useAllWorkflows();
    const workflows = workflowsResult?.data || [];

    // Prune stale selections whenever the filtered list changes (tab switch,
    // workflow filter change, or after a server refetch) so "select-all" can't
    // silently keep ids that are no longer visible.
    useEffect(() => {
        const visible = new Set((instances || []).map((i) => i.id));
        setChecked((prev) => {
            const next = new Set();
            for (const id of prev) if (visible.has(id)) next.add(id);
            return next.size === prev.size ? prev : next;
        });
    }, [instances]);

    const selected = Array.from(checked);
    const visibleIds = (instances || []).map((i) => i.id);
    const allVisibleChecked =
        visibleIds.length > 0 && visibleIds.every((id) => checked.has(id));

    function toggle(id) {
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (allVisibleChecked) {
            setChecked(new Set());
        } else {
            setChecked(new Set(visibleIds));
        }
    }

    async function handlePrintBundle() {
        if (!selected.length) return toast.error(t.affairs.selectAtLeastOne);
        try {
            setIsPrintingBundle(true);
            const url = await fetchBulkMergedPdfUrl(selected);
            await printPdfBlobUrl(url);
            // Server has auto-marked eligible ones as printed — refresh lists.
            qc.invalidateQueries({ queryKey: ["affairs-instances"] });
            qc.invalidateQueries({ queryKey: ["affairs-pending-count"] });
            setChecked(new Set());
        } catch (e) {
            toast.error(e.message);
        } finally {
            setIsPrintingBundle(false);
        }
    }

    return (
        <Page>
            <HeaderRow>
                <Heading as="h1">{t.affairs.inbox}</Heading>
                <Actions>
                    <Button
                        onClick={handlePrintBundle}
                        loading={isPrintingBundle}
                        disabled={!selected.length}
                        icon={<HiOutlinePrinter />}
                    >
                        {t.affairs.printSelected}
                    </Button>
                </Actions>
            </HeaderRow>

            <FilterBar>
                <Tabs>
                    {STATUS_TABS.map((s) => (
                        <Tab
                            key={s.key}
                            $active={status === s.key}
                            onClick={() => {
                                setStatus(s.key);
                                setChecked(new Set());
                            }}
                        >
                            {s.label}
                        </Tab>
                    ))}
                </Tabs>
                <Select
                    value={workflowId}
                    onChange={(e) => setWorkflowId(e.target.value)}
                >
                    <option value="">
                        {t.affairs.all} — {t.affairs.workflowFilter}
                    </option>
                    {(workflows || []).map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.title}
                        </option>
                    ))}
                </Select>

                <SelectAllWrapper>
                    <input
                        type="checkbox"
                        checked={allVisibleChecked}
                        disabled={visibleIds.length === 0}
                        onChange={toggleSelectAll}
                    />
                    {t.affairs.selectAll}
                    {visibleIds.length > 0 && ` (${visibleIds.length})`}
                </SelectAllWrapper>
            </FilterBar>

            {isPending ? (
                <Spinner />
            ) : instances.length === 0 ? (
                <Empty resource={t.affairs.empty} />
            ) : (
                instances.map((i) => (
                    <AffairsInstanceCard
                        key={i.id}
                        instance={i}
                        checked={checked.has(i.id)}
                        onToggle={toggle}
                    />
                ))
            )}
        </Page>
    );
}

export default AffairsCompletedInstances;
