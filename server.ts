import express from "express";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// Safe resolution of directory names for ESM and CJS environments
let currentDirname = process.cwd();
try {
  if (typeof __dirname !== "undefined") {
    currentDirname = __dirname;
  } else if (typeof import.meta !== "undefined" && import.meta.url) {
    currentDirname = path.dirname(fileURLToPath(import.meta.url));
  }
} catch (e) {
  console.log("Using process.cwd() fallback for directory resolution");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: System Update
  app.get("/api/system-update", (req, res) => {
    const isWindows = process.platform === "win32";
    // On Linux/Mac we execute update_system.sh, on Windows we execute update_system.bat
    const command = isWindows ? "cmd.exe /c update_system.bat" : "/bin/bash update_system.sh";

    console.log(`Executing system update command: ${command}`);

    // Give it a 5-minute timeout in case building or npm install takes time
    exec(command, { timeout: 300000, cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error("System update script failed:", error);
        return res.status(500).json({
          status: "error",
          message: error.message,
          error: stderr || error.toString(),
          stdout: stdout
        });
      }

      console.log("System update completed successfully.");
      res.json({
        status: "success",
        stdout: stdout || "تم تحديث المنظومة بنجاح!",
        stderr: stderr
      });
    });
  });

  // Serve Vite in Dev, or Static files in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
