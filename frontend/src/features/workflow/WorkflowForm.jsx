import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import styled from "styled-components";

import Select from "@components/inputs/Select";
import ProgressStepper from "@components/ProgressStepper";
import Button from "@components/Button";
import Heading from "@components/Heading";
import Autocomplete from "@components/inputs/Autocomplete";

import { useAllWorkflows } from "./hooks/useAllWorkflows";
import { useCreateInstance } from "./hooks/useCreateInstance";
import useDepartments from "@features/request/hooks/useDepartments";
import { useSearchStudents } from "./hooks/useSearchStudents";
import { useSearchProfessors } from "./hooks/useSearchProfessors";
import { translator as t } from "@data/translations/ar";
import { useUser } from "@features/user/hooks/useUser";


const Container = styled.form`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow-y: auto;
  gap: 2rem;
`;

const Content = styled.div`
  flex: 1 1 auto;
  /* overflow-y: auto; */
  /* padding-bottom: 2rem; */
  max-height: 50rem;
`;

const Footer = styled.footer`
  flex-shrink: 0;
  /* margin-top: auto; */
  /* padding-top: 4rem; */
  border-top: 1px solid var(--color-grey-200);
`;


const FormSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  margin-bottom: 3rem;
  align-items: start;
`;

const SelectGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--color-grey-700);
  margin-bottom: 0.6rem;
`;

const Description = styled.div`
  width: 100%;
  min-height: 12rem;
  padding: 1.6rem;
  border: 1px solid var(--color-brand-600);
  border-radius: var(--border-radius-md);
  background-color: var(--color-grey-0);
  font-size: 1.4rem;
  line-height: 1.6;
  color: var(--color-grey-700);
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-top: 2rem;
  padding-top: 4rem;
`;

const StyledHeading = styled(Heading)`
  margin-bottom: 3rem;
`;

const Chip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: var(--color-brand-100, #eef);
  color: var(--color-brand-700, #333);
  font-size: 1.3rem;
  margin-inline-end: 0.6rem;
  margin-bottom: 0.4rem;
`;

const ChipRemove = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
`;

function workflowHasMultiApprovalStage(wf) {
  return !!(wf?.stages || []).some((s) => s?.isMultiApproval);
}
function isSupervisionWorkflow(wf) {
  return wf?.title === "تحديد الاشراف";
}

function WorkFlowForm() {
  const { data: workflows } = useAllWorkflows();
  const { createInstance, isPending } = useCreateInstance();
  const { departments } = useDepartments();

  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      workflowId: "",
      departmentId: "",
      student: null,
      professors: [],
    },
  });

  const selectedWorkflowId = watch("workflowId");
  const selectedDepartment = watch("departmentId");
  const student = watch("student");
  const professors = watch("professors");

  const selectedWorkflow = useMemo(
    () => workflows?.find((wf) => wf?.id == selectedWorkflowId),
    [workflows, selectedWorkflowId],
  );

  const showSupervisors = workflowHasMultiApprovalStage(selectedWorkflow);
  const studentScope = isSupervisionWorkflow(selectedWorkflow)
    ? "all"
    : "supervised";

  // ==== Hook-driven autocomplete data ====
  const {
    students,
    isFetching: isStudentsLoading,
    setQuery: setStudentQuery,
  } = useSearchStudents({ scope: studentScope, enabled: !!selectedWorkflow });

  const { user: currentUser } = useUser();


  const {
    professors: profOptionsRaw,
    isFetching: isProfessorsLoading,
    setQuery: setProfessorQuery,
  } = useSearchProfessors({ enabled: showSupervisors });

  // Backend already excludes self; this is a belt-and-braces filter.
  const profOptions = useMemo(
    () =>
      (profOptionsRaw || []).filter((p) => !currentUser || p.id !== currentUser.id),
    [profOptionsRaw, currentUser],
  );


  async function onSubmit(data) {
    createInstance({
      workflowId: Number(data.workflowId),
      departmentId: Number(data.departmentId),
      studentCode: data.student?.code,
      professorIds: (data.professors || []).map((p) => p.id),
    });
  }

  const isStartEnabled = Boolean(
    selectedWorkflowId && selectedDepartment && student,
  );

  return (
    <Container onSubmit={handleSubmit(onSubmit)}>
      <Content>
        <StyledHeading as="h1">{t.workflow.startNew}</StyledHeading>

        <FormSection>
          <SelectGroup>
            <Controller
              control={control}
              name="workflowId"
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder={t.workflow.chooseWorkflow}
                  options={workflows}
                />
              )}
            />

            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder={t.workflow.selectDepartment}
                  options={departments}
                />
              )}
            />

            {selectedWorkflow && (
              <div>
                <FieldLabel>{t.workflow.selectStudent}</FieldLabel>
                <Controller
                  control={control}
                  name="student"
                  render={({ field }) => (
                    <Autocomplete
                      value={field.value}
                      onChange={field.onChange}
                      items={students}
                      isLoading={isStudentsLoading}
                      onQueryChange={setStudentQuery}
                      itemKey={(it) => it.code}
                      getInputValue={(it) => `${it.code} — ${it.name}`}
                      renderItem={(it) => ({ primary: it.name, sub: it.code })}
                      placeholder={t.workflow.studentPlaceholder}
                      showAvatar={false}
                    />
                  )}
                />
              </div>
            )}

            {showSupervisors && (
              <div>
                <FieldLabel>{t.workflow.selectSupervisors}</FieldLabel>
                <Autocomplete
                  value={null}
                  onChange={(prof) => {
                    if (!prof) return;
                    const list = professors || [];
                    if (list.some((p) => p.id === prof.id)) return;
                    setValue("professors", [...list, prof], {
                      shouldDirty: true,
                    });
                  }}
                  items={profOptions}
                  isLoading={isProfessorsLoading}
                  onQueryChange={setProfessorQuery}
                  itemKey={(it) => it.id}
                  getInputValue={(it) => `${it.firstName} ${it.lastName}`}
                  renderItem={(it) => ({
                    primary: `${it.firstName} ${it.lastName}`,
                    sub: `#${it.id}`,
                    avatar: it.profilePicture,
                  })}
                  placeholder={t.workflow.supervisorPlaceholder}
                  showAvatar={true}
                />
                <div style={{ marginTop: "0.8rem" }}>
                  {(professors || []).map((p) => (
                    <Chip key={p.id}>
                      {p.firstName} {p.lastName}
                      <ChipRemove
                        type="button"
                        onClick={() =>
                          setValue(
                            "professors",
                            professors.filter((x) => x.id !== p.id),
                            { shouldDirty: true },
                          )
                        }
                      >
                        ×
                      </ChipRemove>
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </SelectGroup>

          <Description>
            {selectedWorkflowId
              ? selectedWorkflow?.description
              : t.messages.selectWorkflow}
          </Description>
        </FormSection>
      </Content>

      <Footer>
        <ProgressStepper currentStep={1} items={selectedWorkflow?.stages || []} />
        <ButtonContainer>
          <Button
            $size="large"
            loading={isPending}
            disabled={!isStartEnabled}
            type="submit"
          >
            {t.actions.save}
          </Button>
        </ButtonContainer>
      </Footer>
    </Container>
  );
}

export default WorkFlowForm;
