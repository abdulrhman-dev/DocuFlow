import { icons } from "@data/icons";
import { StyledNavLink } from "@components/NavLink";
import LogoutButton from "@features/auth/logout/LogoutButton";
import NavBadge from "@components/NavBadge";
import { useAuth } from "@context/AuthContext";
import {
  useUnrespondedCount,
  useDraftCount,
  useDeanPendingCount,
} from "@features/request/hooks/useRequestCounts";

function NavItem({ data }) {
  const { user } = useAuth();

  const { icon, to, name, label, badge } = data;
  const IconComponent = icons[icon];

  const unresponded = useUnrespondedCount();
  const draftCount = useDraftCount();
  const deanPending = useDeanPendingCount();

  if (user && data.roles && !data.roles.includes(user.role)) return null;

  let badgeCount = 0;
  let badgeVariant = "red";
  if (badge === "inboxUnresponded") {
    badgeCount = unresponded;
    badgeVariant = "red";
  } else if (badge === "drafts") {
    badgeCount = draftCount;
    badgeVariant = "grey";
  } else if (badge === "deanPending") {
    badgeCount = deanPending;
    badgeVariant = "red";
  }

  const IconWithBadge = () => {
    if (!IconComponent) return null;
    if (!badge) return <IconComponent />;
    return (
      <NavBadge count={badgeCount} variant={badgeVariant}>
        <IconComponent />
      </NavBadge>
    );
  };

  if (name === "logout") {
    return (
      <StyledNavLink>
        <IconWithBadge />
        <LogoutButton />
      </StyledNavLink>
    );
  }

  return (
    <li>
      <StyledNavLink to={to}>
        <IconWithBadge />
        <span>{label}</span>
      </StyledNavLink>
    </li>
  );
}

export default NavItem;
