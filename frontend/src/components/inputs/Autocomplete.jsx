import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { HiChevronDown, HiXMark } from "react-icons/hi2";
import { getProfilePictureUrl } from "@features/user/utils";

const rotate = keyframes`to { transform: rotate(1turn); }`;

const InlineSpinner = styled.span`
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  border: 2px solid var(--color-grey-300);
  border-top-color: var(--color-brand-600);
  animation: ${rotate} 0.8s linear infinite;
  display: inline-block;
  box-sizing: border-box;
`;

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

/* Matches Select.jsx styling for consistency */
const StyledInput = styled.input`
  width: 100%;
  padding: 1.2rem 4rem 1.2rem 1.6rem;
  border: 2px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-size: 1.6rem;
  color: var(--color-grey-700);
  appearance: none;

  &:focus {
    outline: none;
    border-color: var(--color-brand-600);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
  &::placeholder { color: var(--color-grey-400); }
  &:disabled {
    background-color: var(--color-grey-100);
    cursor: not-allowed;
  }
`;

const RightAdornment = styled.div`
  position: absolute;
  inset-inline-end: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-grey-400);
  pointer-events: none;
  & > button, & > .clickable { pointer-events: auto; }
`;

const IconButton = styled.button.attrs({ className: "clickable" })`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-grey-500);
  display: inline-flex;
  &:hover { color: var(--color-grey-800); }
`;

const Dropdown = styled.ul`
  position: absolute;
  z-index: 5;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  max-height: 22rem;
  overflow-y: auto;
  background: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-md);
  list-style: none;
  margin: 0;
  padding: 0.4rem 0;
`;

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 1rem;
  cursor: pointer;
  font-size: 1.4rem;
  color: var(--color-grey-800);
  &:hover { background: var(--color-grey-100); }
`;

const EmptyItem = styled.li`
  padding: 1rem;
  font-size: 1.3rem;
  color: var(--color-grey-500);
  text-align: center;
  display: flex;
  justify-content: center;
`;

const Avatar = styled.img`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.15;
`;

const Primary = styled.span`
  color: var(--color-grey-800);
  font-weight: 500;
`;

const Sub = styled.span`
  color: var(--color-grey-500);
  font-size: 1.2rem;
`;

/**
 * Autocomplete — hook-driven (parent owns items + isLoading + query).
 *
 * Props:
 *   value              currently selected item (or null)
 *   onChange(item|null)
 *   items              options provided by parent
 *   isLoading          true when parent is fetching
 *   onQueryChange(str) called on each keystroke; debounce lives in the parent
 *   itemKey(it) => id
 *   getInputValue(it) => label
 *   renderItem(it) => { primary, sub?, avatar? }
 *   placeholder
 *   showAvatar         default true
 *   disabled           default false
 */
function Autocomplete({
    value,
    onChange,
    items = [],
    isLoading = false,
    onQueryChange,
    itemKey,
    getInputValue,
    renderItem,
    placeholder,
    showAvatar = true,
    disabled = false,
}) {
    const [input, setInput] = useState(() =>
        value ? getInputValue(value) : "",
    );
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    // Track WHICH value we last synced from so we don't clobber user input on
    // unrelated re-renders (this is the root cause of the "erase on keystroke"
    // bug — parent re-renders after onChange, effect sees `value` prop again,
    // and previously reset `input`).
    const syncedKeyRef = useRef(value ? itemKey(value) : null);

    useEffect(() => {
        const currentKey = value ? itemKey(value) : null;
        if (currentKey === syncedKeyRef.current) return; // nothing to sync
        syncedKeyRef.current = currentKey;
        setInput(value ? getInputValue(value) : "");
    }, [value, itemKey, getInputValue]);

    useEffect(() => {
        function onDoc(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    function handleTyping(e) {
        const v = e.target.value;
        setInput(v);
        setOpen(true);
        // Only clear the parent's selection when the typed text no longer
        // matches the selected item's label — this stops the erase-on-keystroke
        // race caused by RHF re-renders resetting the input.
        if (value) {
            const currentLabel = getInputValue(value);
            if (v !== currentLabel) {
                onChange(null);
                syncedKeyRef.current = null;
            }
        }
        onQueryChange?.(v);
    }

    function handleSelect(item) {
        syncedKeyRef.current = itemKey(item);
        setInput(getInputValue(item));
        onChange(item);
        setOpen(false);
    }

    function handleClear() {
        syncedKeyRef.current = null;
        setInput("");
        onChange(null);
        onQueryChange?.("");
    }

    return (
        <Wrapper ref={wrapperRef}>
            <StyledInput
                disabled={disabled}
                value={input}
                placeholder={placeholder}
                onFocus={() => {
                    setOpen(true);
                    // Kick off a fresh fetch on focus so the dropdown isn't empty
                    onQueryChange?.(input);
                }}
                onChange={handleTyping}
            />

            <RightAdornment>
                {isLoading && <InlineSpinner aria-label="loading" />}
                {value && !disabled && !isLoading && (
                    <IconButton type="button" onClick={handleClear} aria-label="clear">
                        <HiXMark size={18} />
                    </IconButton>
                )}
                {!value && !isLoading && <HiChevronDown size={18} />}
            </RightAdornment>

            {open && !disabled && (
                <Dropdown>
                    {isLoading && items.length === 0 && (
                        <EmptyItem><InlineSpinner /></EmptyItem>
                    )}
                    {!isLoading && items.length === 0 && <EmptyItem>—</EmptyItem>}
                    {items.map((it) => {
                        const rendered = renderItem(it);
                        return (
                            <Item key={itemKey(it)} onMouseDown={() => handleSelect(it)}>
                                {showAvatar && (
                                    <Avatar
                                        src={
                                            rendered.avatar
                                                ? getProfilePictureUrl(rendered.avatar)
                                                : undefined
                                        }
                                        alt=""
                                    />
                                )}
                                <Meta>
                                    <Primary>{rendered.primary}</Primary>
                                    {rendered.sub && <Sub>{rendered.sub}</Sub>}
                                </Meta>
                            </Item>
                        );
                    })}
                </Dropdown>
            )}
        </Wrapper>
    );
}

export default Autocomplete;
