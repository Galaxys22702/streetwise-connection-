export function createCommandControls({ api, byId, isChatBusy = () => false, onRunningChange = () => {} }) {
  let ticket = null;
  let running = false;
  let generation = 0;
  const controls = ["prepare-command", "run-command", "cancel-command", "command", "command-cwd"];

  function invalidate() {
    generation++;
    ticket = null;
    byId("command-review").hidden = true;
    byId("prepare-command").disabled = false;
  }
  function changed() {
    invalidate();
    byId("command-notice").textContent = "Draft changed. Review this command before running it.";
  }
  for (const id of ["command", "command-cwd"]) byId(id).addEventListener("input", changed);
  document.querySelectorAll("[data-command]").forEach(button => button.addEventListener("click", () => {
    if (running || isChatBusy()) return;
    changed();
    byId("command").value = button.dataset.command;
    byId("command").focus();
  }));
  byId("cancel-command").addEventListener("click", () => {
    invalidate();
    byId("command-notice").textContent = "Command canceled. Nothing was executed.";
  });
  byId("command-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (running || isChatBusy()) return;
    invalidate();
    const requestGeneration = generation;
    byId("prepare-command").disabled = true;
    const command = byId("command").value;
    const cwd = byId("command-cwd").value;
    try {
      const prepared = await api("/api/jarvis/commands/prepare", { command, cwd });
      // Discard a review if the owner changed the command or disconnected meanwhile.
      if (generation !== requestGeneration || command !== byId("command").value || cwd !== byId("command-cwd").value || byId("workspace").hidden) return;
      ticket = prepared;
      byId("review-command").textContent = ticket.command;
      byId("review-cwd").textContent = `Starting directory: ${ticket.cwd}`;
      byId("command-review").hidden = false;
      byId("command-notice").textContent = "Review the exact command above. It has not run yet. Approval expires in five minutes.";
    } catch (error) {
      if (generation === requestGeneration && !byId("workspace").hidden) byId("command-notice").textContent = error.message;
    } finally {
      if (generation === requestGeneration) byId("prepare-command").disabled = false;
    }
  });
  byId("run-command").addEventListener("click", async () => {
    if (!ticket || running || isChatBusy()) return;
    const approved = ticket;
    invalidate();
    running = true;
    onRunningChange(true);
    controls.forEach(id => { byId(id).disabled = true; });
    byId("disconnect").disabled = true;
    byId("command-output").textContent = "";
    byId("command-last-result").textContent = "";
    byId("command-notice").textContent = "Running your approved command…";
    try {
      const result = await api("/api/jarvis/commands/run", { id: approved.id });
      byId("command-output").textContent = result.output || "(No output)";
      byId("command-last-result").textContent = `Last run: ${result.command} · Starting directory: ${result.cwd}`;
      const outcome = result.timedOut ? "Timed out" : result.truncated ? "Stopped at the output limit" :
        result.succeeded ? "Completed" : "Command failed";
      byId("command-notice").textContent = `${outcome}. Exit code: ${result.exitCode ?? "none"}. Duration: ${(result.durationMs / 1000).toFixed(1)} seconds.`;
    } catch (error) { byId("command-notice").textContent = error.message; }
    finally {
      running = false;
      onRunningChange(false);
      controls.forEach(id => { byId(id).disabled = false; });
      byId("disconnect").disabled = isChatBusy();
    }
  });
  return {
    get running() { return running; },
    connect(available) {
      byId("command-tools").hidden = !available;
      byId("command-availability").textContent = available ? "Development runner connected. Commands start in your configured project workspace." :
        "Command execution needs an explicitly enabled local development runner. It is disabled on public and serverless deployments.";
    },
    reset() {
      invalidate();
      byId("command-output").textContent = "";
      byId("command-last-result").textContent = "";
      byId("command-notice").textContent = "";
      byId("review-command").textContent = "";
      byId("review-cwd").textContent = "";
      byId("command").value = "";
      byId("command-cwd").value = ".";
    }
  };
}
