$here = Split-Path -Parent $MyInvocation.MyCommand.Path
5000, 5173, 5174 | ForEach-Object {
    Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -gt 4 } |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$here\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$here\frontend'; npm run dev"
