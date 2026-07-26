import styled from "styled-components";

import { navLinks } from "@data/sidebar/profs";
import SidebarItem from "@components/SidebarItem";
import { useAuth } from "@context/AuthContext";
import Spinner from "./Spinner";

const NavList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

function MainNav() {

  const { isPending } = useAuth();
  return (
    <nav>
      {
        isPending ?
          <Spinner />
          :

          <NavList> {navLinks.map((link) => (<SidebarItem key={link?.name} data={link} />
          ))}
          </NavList>
      }
    </nav>
  );
}

export default MainNav;
