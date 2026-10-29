const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

// Own AppUserModelID so Windows groups the taskbar button under this app's icon, not Electron's.
app.setAppUserModelId("com.local.jlptpractice");

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: "#0b1020",
    title: "JLPT N3 Practice",
    icon: path.join(__dirname, "Icons", "icon.ico"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
