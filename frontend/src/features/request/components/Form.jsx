import { useEffect, useState } from "react";
import styled from "styled-components";
import { JsonForms } from "@jsonforms/react";
import { materialRenderers } from "@jsonforms/material-renderers";

import InputFieldRenderer from "@components/InputFieldRenderer";
import ActionButtons from "@components/ActionButtons";
import Button from "@components/Button";

import { InputFieldTester } from "../renderers/inputFieldTester";
import useDocData from "../hooks/useDocData";
import { usePatchDoc } from "../hooks/usePatchDoc";
import DocxViewer from "./DocxViewer";
import JsonFormsThemeWrapper from "./JsonFormsThemeWrapper";

import { translator as t } from "@data/translations/ar";

const Container = styled.div`
  display: flex;
  gap: 2rem;
  width: ${(props) =>
    props.$isSideBySide ? "min(140rem, 92vw)" : "min(80rem, 92vw)"};
  max-height: 85vh;
  transition: width 0.3s;
  color: var(--color-grey-700);
`;

const FormSection = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
`;

const FormHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
  flex-shrink: 0;
`;

const FormBody = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding-inline-end: 0.6rem;
  color: var(--color-grey-700);
`;

const FormFooter = styled.div`
  flex-shrink: 0;
  border-top: 1px solid var(--color-grey-200);
  padding-top: 1.2rem;
  margin-top: 1.2rem;
  background-color: var(--color-grey-0);
`;

const PreviewSection = styled.div`
  flex: 1;
  min-width: 0;
  border-left: 1px solid var(--color-grey-200);
  padding-left: 2rem;
  overflow: auto;
  max-height: 85vh;
`;

function Form({ onClose, id }) {
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isSideBySide, setIsSideBySide] = useState(false);
  const { patchDocument, isPending: isPatching } = usePatchDoc(id);
  const { doc, isPending } = useDocData({ docId: id });

  useEffect(() => {
    if (!isPending && doc) setData(doc.data || {});
  }, [doc, isPending]);

  function handleSaveForm() {
    patchDocument(
      { docData: data, id },
      { onSuccess: () => onClose() },
    );
  }

  if (isPending) return null;

  return (
    <Container $isSideBySide={isSideBySide}>
      <FormSection>
        <FormHeader>
          <Button
            $variation="secondary"
            size="small"
            onClick={() => setIsSideBySide((s) => !s)}
          >
            {isSideBySide ? t.documents.closePreview : t.documents.sideBySide}
          </Button>
        </FormHeader>

        <FormBody>
          {data && (
            <JsonFormsThemeWrapper>
              <JsonForms
                schema={doc?.template?.schema}
                uischema={doc?.template?.uiSchema}
                data={data}
                onChange={({ data: nextData, errors }) => {
                  setData(nextData);
                  setErrors(errors);
                }}
                renderers={[
                  ...materialRenderers,
                  {
                    tester: InputFieldTester,
                    renderer: InputFieldRenderer,
                  },
                ]}
              />
            </JsonFormsThemeWrapper>
          )}
        </FormBody>

        <FormFooter>
          <ActionButtons
            isCancelDanger={false}
            textSave={t.actions.save}
            textCancel={t.actions.cancel}
            onSave={handleSaveForm}
            onCancel={onClose}
            isSaving={isPatching}
          />
        </FormFooter>
      </FormSection>

      {isSideBySide && (
        <PreviewSection>
          <DocxViewer documentId={id} />
        </PreviewSection>
      )}
    </Container>
  );
}

export default Form;
