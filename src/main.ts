import "./styles/main.css";

// Entry point. Milestones wire up the engine, board UI, solver worker,
// live math panel, and auto-play controller here.
function bootstrap(): void {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing #app root element");
  }
  // Scaffold only: real initialization arrives with the engine and UI modules.
}

bootstrap();
