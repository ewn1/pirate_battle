import React from "react";
import styled from "styled-components";

export const TouchControls: React.FC = () => {
  const dispatchKey = (key: string, type: "keydown" | "keyup") => {
    window.dispatchEvent(new KeyboardEvent(type, { key }));
  };

  const handleTouchStart =
    (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      dispatchKey(key, "keydown");
    };

  const handleTouchEnd =
    (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      dispatchKey(key, "keyup");
    };

  return (
    <ControlsWrapper>
      {/* Controles D-Pad (Movimentação e Rotação) */}
      <DPadGrid>
        <EmptySlot />
        <TouchButton
          onTouchStart={handleTouchStart("ArrowUp")}
          onTouchEnd={handleTouchEnd("ArrowUp")}
          onMouseDown={handleTouchStart("ArrowUp")}
          onMouseUp={handleTouchEnd("ArrowUp")}
          aria-label="Forward"
        >
          <ButtonIcon
            src="/assets/png/default/ui/controls/icon_forward.png"
            alt=""
          />
        </TouchButton>
        <EmptySlot />
        <TouchButton
          onTouchStart={handleTouchStart("ArrowLeft")}
          onTouchEnd={handleTouchEnd("ArrowLeft")}
          onMouseDown={handleTouchStart("ArrowLeft")}
          onMouseUp={handleTouchEnd("ArrowLeft")}
          aria-label="Turn Left"
        >
          <ButtonIcon
            src="/assets/png/default/ui/controls/icon_turn_left.png"
            alt=""
          />
        </TouchButton>
        <EmptySlot />
        <TouchButton
          onTouchStart={handleTouchStart("ArrowRight")}
          onTouchEnd={handleTouchEnd("ArrowRight")}
          onMouseDown={handleTouchStart("ArrowRight")}
          onMouseUp={handleTouchEnd("ArrowRight")}
          aria-label="Turn Right"
        >
          <ButtonIcon
            src="/assets/png/default/ui/controls/icon_turn_right.png"
            alt=""
          />
        </TouchButton>
      </DPadGrid>

      {/* Botões de Ataque / Canhões */}
      <ActionGroup>
        <TouchButton
          onTouchStart={handleTouchStart("q")}
          onTouchEnd={handleTouchEnd("q")}
          onMouseDown={handleTouchStart("q")}
          onMouseUp={handleTouchEnd("q")}
          aria-label="Broadside Left"
        >
          <ButtonIcon
            src="/assets/png/default/ui/controls/icon_fire_left.png"
            alt=""
          />
        </TouchButton>

        <TouchButton
          $large
          onTouchStart={handleTouchStart(" ")}
          onTouchEnd={handleTouchEnd(" ")}
          onMouseDown={handleTouchStart(" ")}
          onMouseUp={handleTouchEnd(" ")}
          aria-label="Fire Front"
        >
          <ButtonIcon
            $large
            src="/assets/png/default/ui/controls/icon_fire_front.png"
            alt=""
          />
        </TouchButton>

        <TouchButton
          onTouchStart={handleTouchStart("e")}
          onTouchEnd={handleTouchEnd("e")}
          onMouseDown={handleTouchStart("e")}
          onMouseUp={handleTouchEnd("e")}
          aria-label="Broadside Right"
        >
          <ButtonIcon
            src="/assets/png/default/ui/controls/icon_fire_right.png"
            alt=""
          />
        </TouchButton>
      </ActionGroup>
    </ControlsWrapper>
  );
};

const ControlsWrapper = styled.div`
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 24px;
  pointer-events: none;
  z-index: 50;
`;

const DPadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 54px);
  grid-template-rows: repeat(2, 54px);
  gap: 8px;
  pointer-events: auto;
`;

const EmptySlot = styled.div``;

const ActionGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
  pointer-events: auto;
`;

const TouchButton = styled.button<{ $large?: boolean }>`
  width: ${(props) => (props.$large ? "64px" : "54px")};
  height: ${(props) => (props.$large ? "64px" : "54px")};
  background-image: url("/assets/png/default/ui/controls/button_round_normal.png");
  background-size: cover;
  border: none;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;

  &:active {
    background-image: url("/assets/png/default/ui/controls/button_round_pressed.png");
  }
`;

const ButtonIcon = styled.img<{ $large?: boolean }>`
  width: ${(props) => (props.$large ? "30px" : "24px")};
  height: auto;
`;
