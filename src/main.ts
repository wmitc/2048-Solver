import "./styles/main.css";
import { GameController } from "./ui/controller.ts";
import { attachInput } from "./ui/input.ts";

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

  const controller = new GameController(boardEl);

  const overlay = document.createElement("div");
  overlay.className = "board-overlay hidden";
  boardEl.appendChild(overlay);

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
  });

  attachInput(boardEl, { onMove: (direction) => controller.move(direction) });
  newGameBtn.addEventListener("click", () => controller.newGame());
}

bootstrap();
