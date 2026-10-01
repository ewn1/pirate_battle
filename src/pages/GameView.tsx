import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { GameEngine } from "../game/core/GameEngine";
import { Button } from "../components/ui/Button";

const GameContainer = styled.div`
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
`;

const PixiCanvasWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1; /* Fica no fundo */
`;

const HUDOverlay = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 2; /* Fica por cima do canvas */
  display: flex;
  gap: 20px;
`;

export const GameView = () => {
  const navigate = useNavigate();
  // Referência para a div onde o PixiJS vai injetar o canvas
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let engine: GameEngine | null = null;

    if (canvasRef.current) {
      // Instancia a engine
      engine = new GameEngine();

      // Inicializa passando a div como container
      engine.init(canvasRef.current).catch((err) => {
        console.error("Erro ao inicializar o PixiJS:", err);
      });
    }

    // Função de limpeza (Cleanup) chamada quando o componente é desmontado
    return () => {
      if (engine) {
        engine.destroy();
      }
    };
  }, []); // O array vazio garante que inicie apenas uma vez na montagem

  return (
    <GameContainer>
      {/* O Canvas do jogo entra aqui */}
      <PixiCanvasWrapper ref={canvasRef} />

      {/* HUD do React por cima do Jogo */}
      <HUDOverlay>
        <Button onClick={() => navigate("/")}>Abandonar Partida</Button>
      </HUDOverlay>
    </GameContainer>
  );
};
