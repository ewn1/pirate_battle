import styled from "styled-components";

export const Button = styled.button`
  background-image: url("/assets/png/default/ui/menu/button_primary_normal.png");
  background-size: 100% 100%;
  background-color: transparent;
  border: none;
  color: #fff;
  font-weight: bold;
  font-size: 1.2rem;
  text-transform: uppercase;
  padding: 15px 30px;
  cursor: pointer;
  min-width: 180px;
  transition: transform 0.1s;
  outline: none;
  text-shadow: 2px 2px 0 #000;

  &:hover,
  &:focus {
    background-image: url("/assets/png/default/ui/menu/button_primary_hover.png");
    transform: scale(1.05);
  }

  &:active {
    background-image: url("/assets/png/default/ui/menu/button_primary_pressed.png");
    transform: scale(0.95);
  }
`;
