import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import {
    HiOutlinePlus,
    HiOutlineXMark,
    HiOutlineBriefcase,
    HiOutlineAcademicCap,
    HiOutlineEnvelope,
} from "react-icons/hi2";

import Button from "@components/Button";
import {
    lookupOutsideSupervisor,
    upsertOutsideSupervisor,
} from "./services/outsideSupervisors";
import { translator as t } from "@data/translations/ar";

/* ---------- layout ---------- */
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EmailRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.6rem;
  align-items: center;
`;

const Input = styled.input`
  padding: 0.9rem 1.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background: var(--color-grey-0);
  font-size: 1.4rem;
  color: var(--color-grey-800);
  &:focus {
    outline: none;
    border-color: var(--color-brand-600);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }
`;

const ToggleRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: 1.25rem;
  background: var(--color-grey-0);
  color: var(--color-grey-700);
  user-select: none;

  & input {
    accent-color: var(--color-brand-600);
    width: 1.5rem;
    height: 1.5rem;
    cursor: pointer;
  }
`;

const DetailsCard = styled.div`
  padding: 1rem 1.2rem;
  border: 1px dashed var(--color-brand-600);
  border-radius: var(--border-radius-md);
  background: var(--color-grey-50);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 1.15rem;
  color: var(--color-grey-600);
`;

const Notice = styled.div`
  font-size: 1.2rem;
  color: var(--color-grey-500);
`;

const Chip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  background: var(--color-brand-100, #eef);
  color: var(--color-brand-700, #333);
  border-radius: 999px;
  font-size: 1.3rem;
`;

const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const ChipRemove = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  display: inline-flex;
`;

/* ---------- helpers ---------- */
function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ""));
}
function acceptsAcademic(email) {
    const lo = String(email || "").toLowerCase();
    return lo.endsWith(".edu") || lo.endsWith(".edu.eg");
}

/* ---------- component ---------- */
export default function OutsideSupervisorsPicker({ value, onChange }) {
    const items = Array.isArray(value) ? value : [];

    // input state
    const [email, setEmail] = useState("");
    const [isIndustrial, setIsIndustrial] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [degree, setDegree] = useState("");
    const [existing, setExisting] = useState(null); // hydrated preview
    const [busy, setBusy] = useState(false);

    // Lookup on debounced blur/enter.
    const [checkedEmail, setCheckedEmail] = useState("");

    async function doLookup(target) {
        const norm = target.trim().toLowerCase();
        if (!norm || !isValidEmail(norm)) {
            setExisting(null);
            setCheckedEmail("");
            return;
        }
        try {
            const found = await lookupOutsideSupervisor(norm);
            setCheckedEmail(norm);
            if (found) {
                setExisting(found);
                setFirstName(found.firstName || "");
                setLastName(found.lastName || "");
                setIsIndustrial(!!found.isIndustrial);
                setDegree(found.academicDegreeAndInstitution || "");
            } else {
                setExisting(null);
            }
        } catch (e) {
            toast.error(e.message);
        }
    }

    function resetForm() {
        setEmail("");
        setIsIndustrial(false);
        setFirstName("");
        setLastName("");
        setDegree("");
        setExisting(null);
        setCheckedEmail("");
    }

    async function addOne() {
        const norm = email.trim().toLowerCase();
        if (!isValidEmail(norm)) {
            return toast.error(t.outside.emailInvalid);
        }
        if (!isIndustrial && !acceptsAcademic(norm)) {
            return toast.error(t.outside.academicEmailRequired);
        }
        if (!firstName.trim() || !lastName.trim()) {
            return toast.error(t.outside.nameRequired);
        }
        // Already picked?
        if (items.some((x) => x.email === norm)) {
            return toast.error(t.outside.alreadyAdded);
        }
        try {
            setBusy(true);
            const result = await upsertOutsideSupervisor({
                email: norm,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                isIndustrial: !!isIndustrial,
                academicDegreeAndInstitution: degree.trim() || null,
                // If we detected an existing row and user changed anything,
                // pass force=true so the server writes their edits.
                force: !!existing,
            });
            if (result?.conflict) {
                // Shouldn't happen with force=true, but be defensive.
                toast.error(t.outside.conflictExistingDifferent);
                setExisting(result.existing);
                return;
            }
            const row = result?.row || {
                email: norm,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                isIndustrial: !!isIndustrial,
                academicDegreeAndInstitution: degree.trim() || null,
            };
            onChange([...items, row]);
            resetForm();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    }

    function removeOne(mail) {
        onChange(items.filter((x) => x.email !== mail));
    }

    const emailNorm = email.trim().toLowerCase();
    const emailReady = isValidEmail(emailNorm);
    const emailPolicyOk =
        !emailReady || isIndustrial || acceptsAcademic(emailNorm);

    // Auto lookup on email blur
    function onEmailBlur() {
        if (emailReady && checkedEmail !== emailNorm) doLookup(emailNorm);
    }
    function onEmailKeyDown(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (emailReady) doLookup(emailNorm);
        }
    }

    return (
        <Wrapper>
            <ChipList>
                {items.map((s) => (
                    <Chip key={s.email}>
                        {s.isIndustrial ? <HiOutlineBriefcase /> : <HiOutlineAcademicCap />}
                        <span>
                            {s.firstName} {s.lastName} · {s.email}
                        </span>
                        <ChipRemove
                            type="button"
                            onClick={() => removeOne(s.email)}
                            title={t.actions.delete}
                        >
                            <HiOutlineXMark />
                        </ChipRemove>
                    </Chip>
                ))}
            </ChipList>

            <EmailRow>
                <Input
                    type="email"
                    placeholder={t.outside.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={onEmailBlur}
                    onKeyDown={onEmailKeyDown}
                />
                <ToggleRow>
                    <input
                        type="checkbox"
                        checked={isIndustrial}
                        onChange={(e) => setIsIndustrial(e.target.checked)}
                    />
                    {t.outside.isIndustrial}
                </ToggleRow>
                <Button
                    type="button"
                    $variation="secondary"
                    disabled={!emailReady || !emailPolicyOk || busy}
                    onClick={addOne}
                    icon={<HiOutlinePlus />}
                    loading={busy}
                >
                    {t.outside.add}
                </Button>
            </EmailRow>

            {!emailPolicyOk && emailReady && (
                <Notice style={{ color: "var(--color-red-700)" }}>
                    {t.outside.academicEmailRequired}
                </Notice>
            )}

            {emailReady && (
                <DetailsCard>
                    <FieldLabel>
                        {t.outside.firstName}
                        <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder={t.outside.firstName}
                        />
                    </FieldLabel>
                    <FieldLabel>
                        {t.outside.lastName}
                        <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder={t.outside.lastName}
                        />
                    </FieldLabel>
                    <FieldLabel style={{ gridColumn: "1 / -1" }}>
                        {t.outside.degreeAndInstitution}
                        <Input
                            value={degree}
                            onChange={(e) => setDegree(e.target.value)}
                            placeholder={t.outside.degreeAndInstitutionPlaceholder}
                        />
                    </FieldLabel>
                    {existing && (
                        <Notice style={{ gridColumn: "1 / -1" }}>
                            <HiOutlineEnvelope
                                style={{ verticalAlign: "middle", marginInlineEnd: "0.4rem" }}
                            />
                            {t.outside.existingFound}
                        </Notice>
                    )}
                </DetailsCard>
            )}
        </Wrapper>
    );
}
