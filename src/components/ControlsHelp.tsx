/**
 * [CONTROLS HELP]
 * Shows the keyboard and touch controls (required on the main menu).
 */
import styled from "styled-components";

const ROWS: Array<{ action: string; keys: string[] }> = [
  { action: "Sail forward", keys: ["W", "↑"] },
  { action: "Reverse", keys: ["S", "↓"] },
  { action: "Turn left / right", keys: ["A", "D", "←", "→"] },
  { action: "Fire front cannon", keys: ["Space"] },
  { action: "Fire broadside left / right", keys: ["Q", "E"] },
  { action: "Pause / resume", keys: ["Esc", "P"] },
];

const Section = styled.section`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.28);
`;

const Heading = styled.h2`
  margin-bottom: 6px;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  color: #ffd166;
`;

const List = styled.dl`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  font-size: 0.85rem;
  color: #e8f0f8;

  dd {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }
`;

const Key = styled.kbd`
  min-width: 24px;
  padding: 1px 6px;
  border: 1px solid #ffd166;
  border-radius: 4px;
  background: #13324d;
  font: inherit;
  font-weight: 700;
  text-align: center;
  color: #fff;
`;

const Hint = styled.p`
  margin-top: 8px;
  font-size: 0.8rem;
  text-align: center;
  color: #c4d4e3;
`;

export function ControlsHelp() {
  return (
    <Section aria-labelledby="controls-heading">
      <Heading id="controls-heading">Controls</Heading>
      <List>
        {ROWS.map((row) => (
          <div key={row.action} style={{ display: "contents" }}>
            <dt>{row.action}</dt>
            <dd>
              {row.keys.map((key) => (
                <Key key={key}>{key}</Key>
              ))}
            </dd>
          </div>
        ))}
      </List>
      <Hint>
        Touch devices (landscape): use the on-screen buttons. You can sail and
        fire at the same time.
      </Hint>
    </Section>
  );
}
