import { useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { HiOutlinePrinter } from "react-icons/hi2";

import Heading from "@components/Heading";
import Spinner from "@components/Spinner";
import Button from "@components/Button";
import RequestedDoc from "@features/request/components/RequestedDoc";
import { useAffairsInstance } from "@features/affairs/hooks/useAffairs";
import {
    fetchInstanceMergedPdfUrl,
    printPdfBlobUrl,
} from "@features/affairs/services/affairs";
import { translator as t } from "@data/translations/ar";

const Page = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  direction: rtl;
`;

const Card = styled.div`
  background: var(--color-grey-0);
  padding: 1.6rem 2rem;
  border-radius: 12px;
  border: 1px solid var(--color-grey-200);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: 1rem 2rem;
  margin-top: 1rem;
  color: var(--color-grey-700);
  font-size: 1.35rem;

  & span:first-child {
    color: var(--color-grey-500);
    font-size: 1.15rem;
    display: block;
  }
`;

const StageBlock = styled.section`
  background: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: 12px;
  padding: 1.6rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const StageHead = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  & h3 {
    margin: 0;
    color: var(--color-grey-800);
  }
`;

const StageOrder = styled.span`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--color-brand-600);
  color: var(--color-grey-0);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const DocsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 2rem;
`;

const BottomBar = styled.div`
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.2rem 1.6rem;
  background: var(--color-grey-0);
  border-radius: 12px;
  border: 1px solid var(--color-grey-200);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
`;

function AffairsInstanceDetail() {
    const { id } = useParams();
    const qc = useQueryClient();
    const { data, isPending } = useAffairsInstance(id);
    const [isPrinting, setIsPrinting] = useState(false);

    if (isPending || !data) return <Spinner />;

    const { instance, stageBlocks } = data;

    async function handlePrint() {
        try {
            setIsPrinting(true);
            const url = await fetchInstanceMergedPdfUrl(instance.id);
            await printPdfBlobUrl(url);
            qc.invalidateQueries({ queryKey: ["affairs-instances"] });
            qc.invalidateQueries({ queryKey: ["affairs-instance", String(id)] });
            qc.invalidateQueries({ queryKey: ["affairs-pending-count"] });
        } catch (e) {
            toast.error(e.message);
        } finally {
            setIsPrinting(false);
        }
    }

    return (
        <Page>
            <Card>
                <Heading as="h2">
                    {instance.workflow?.title} —{" "}
                    {instance.student?.name || instance.studentId}
                </Heading>
                <Grid>
                    <div>
                        <span>{t.workflow.selectDepartment}</span>
                        {instance.department?.name}
                    </div>
                    <div>
                        <span>{t.status[instance.status] || instance.status}</span>
                        #{instance.id}
                    </div>
                    {instance.printedAt && (
                        <>
                            <div>
                                <span>{t.affairs.printedAt}</span>
                                {format(new Date(instance.printedAt), "d MMM yyyy, h:mm a", {
                                    locale: ar,
                                })}
                            </div>
                            <div>
                                <span>{t.affairs.printedBy}</span>
                                {instance.printedBy?.firstName} {instance.printedBy?.lastName}
                            </div>
                        </>
                    )}
                    {instance.approvedAt && (
                        <>
                            <div>
                                <span>{t.affairs.approvedAt}</span>
                                {format(new Date(instance.approvedAt), "d MMM yyyy, h:mm a", {
                                    locale: ar,
                                })}
                            </div>
                            <div>
                                <span>{t.affairs.approvedBy}</span>
                                {instance.approvedBy?.firstName}{" "}
                                {instance.approvedBy?.lastName}
                            </div>
                        </>
                    )}
                </Grid>
            </Card>

            {stageBlocks.map((s) => (
                <StageBlock key={s.id}>
                    <StageHead>
                        <StageOrder>{s.stageOrder}</StageOrder>
                        <h3>{s.title}</h3>
                    </StageHead>
                    {s.documents.length ? (
                        <DocsGrid>
                            {s.documents.map((d) => (
                                <RequestedDoc
                                    key={d.id}
                                    doc={{ id: d.id, name: d.name }}
                                    mode="view"
                                />
                            ))}
                        </DocsGrid>
                    ) : null}
                </StageBlock>
            ))}

            <BottomBar>
                <Button
                    onClick={handlePrint}
                    loading={isPrinting}
                    icon={<HiOutlinePrinter />}
                >
                    {t.affairs.printInstance}
                </Button>
            </BottomBar>
        </Page>
    );
}

export default AffairsInstanceDetail;
