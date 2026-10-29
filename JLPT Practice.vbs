' Double-click launcher: rebuilds data from data/*.csv, then opens the app without a console window.
Set sh = CreateObject("WScript.Shell")
' Electron refuses to start when NODE_OPTIONS contains flags like --use-system-ca
sh.Environment("Process")("NODE_OPTIONS") = ""
sh.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

logFile = sh.ExpandEnvironmentStrings("%TEMP%\jlpt_build.log")
If sh.Run("cmd /c node tools\build_data.js > """ & logFile & """ 2>&1", 0, True) <> 0 Then
  MsgBox "Could not build the data (invalid CSV or Node.js missing)." & vbCrLf & "Details: " & logFile, 16, "JLPT Practice"
  WScript.Quit 1
End If

sh.Run """node_modules\electron\dist\electron.exe"" .", 1, False
