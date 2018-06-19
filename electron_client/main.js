import { app, BrowserWindow } from 'electron';



let mainWindow = null;
app.on('window-all-closed', () => {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', () => {
  app.commandLine.appendSwitch('ignore-certificate-errors');

  mainWindow = new BrowserWindow({width: 800, height: 600 ,webPreferences: {
    webSecurity: false
}});
  mainWindow.loadURL('file://' + __dirname + '/index.html');
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

