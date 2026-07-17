import styled from "styled-components";

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const BadgeBubble = styled.span`
  position: absolute;
  top: -0.6rem;
  inset-inline-end: -0.8rem;
  min-width: 1.8rem;
  height: 1.8rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background-color: ${({ $variant }) =>
    $variant === "grey" ? "var(--color-grey-400)" : "var(--color-red-700)"};
  color: #fff;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.8rem;
  text-align: center;
  box-shadow: 0 0 0 2px var(--color-grey-0);
  pointer-events: none;
`;

/**
 * Renders `children` (typically an icon) with a small numeric badge on top.
 * variant: "red" (default) | "grey"
 * Renders nothing extra when count <= 0.
 */
function NavBadge({ count, variant = "red", children }) {
  const display = count > 99 ? "99+" : count;
  return (
    <Wrapper>
      {children}
      {count > 0 && <BadgeBubble $variant={variant}>{display}</BadgeBubble>}
    </Wrapper>
  );
}

export default NavBadge;
