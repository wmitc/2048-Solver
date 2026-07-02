import "./styles/main.css";
import { GameController } from "./ui/controller.ts";
import { attachInput } from "./ui/input.ts";
import { MathPanel } from "./ui/mathPanel.ts";
import { SolverClient } from "./solver/client.ts";

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing #${id} element`);
  }
  return el;
}

function bootstrap(): void {
  const boardEl = requireElement("board");
  const scoreEl = requireElement("score");
  const bestEl = requireElement("best");
  const newGameBtn = requireElement("new-game");
  const mathEl = requireElement("math-panel");

  const controller = new GameController(boardEl);
  const mathPanel = new MathPanel(mathEl);
  const solver = new SolverClient();

  const overlay = document.createElement("div");
  overlay.className = "board-overlay hidden";
  boardEl.appendChild(overlay);

  // Analyze the current position and stream EVs into the math panel. Each call
  // supersedes the previous analysis inside the worker.
  function analyze(): void {
    const { board, over } = controller.getState();
    if (over) {
      mathPanel.clear();
      controller.showHint(null);
      return;
    }
    mathPanel.clear();
    solver.analyze(board, ({ result }) => {
      mathPanel.render(result);
      controller.showHint(result.best);
    });
  }

  controller.onChange(({ state, best }) => {
    scoreEl.textContent = String(state.score);
    bestEl.textContent = String(best);
    if (state.over) {
      overlay.textContent = "Game over";
      overlay.classList.remove("hidden", "won");
    } else if (state.won) {
      overlay.textContent = "2048! Keep going";
      overlay.classList.remove("hidden");
      overlay.classList.add("won");
      window.setTimeout(() => overlay.classList.add("hidden"), 1500);
    } else {
      overlay.classList.add("hidden");
    }
    analyze();
  });

  attachInput(boardEl, { onMove: (direction) => controller.move(direction) });
  newGameBtn.addEventListener("click", () => controller.newGame());
}

bootstrap();
