<#
.SYNOPSIS
    Stop development servers and Docker services
.DESCRIPTION
    Safely stops all running development services
#>

Write-Host "Stopping Shopify SEO Platform services..." -ForegroundColor Cyan
Write-Host ""

# Stop processes on specific ports
$ports = @(3000, 5173, 5555)

foreach ($port in $ports) {
    Write-Host "Checking port $port..." -ForegroundColor Gray
    $connections = netstat -ano | Select-String ":$port" | Select-String "LISTENING"

    if ($connections) {
        foreach ($connection in $connections) {
            $parts = $connection.ToString() -split '\s+' | Where-Object { $_ -ne '' }
            $pid = $parts[-1]

            if ($pid -and $pid -match '^\d+$') {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  Stopping process $($process.Name) (PID: $pid)" -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Host "  ✓ Stopped" -ForegroundColor Green
                    }
                } catch {
                    Write-Host "  ⚠ Could not stop PID $pid" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "  No process found on port $port" -ForegroundColor Gray
    }
}

Write-Host ""

# Stop Docker services
Write-Host "Stopping Docker services..." -ForegroundColor Gray
try {
    docker-compose down 2>$null
    Write-Host "✓ Docker services stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠ Docker not available or already stopped" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✓ All services stopped" -ForegroundColor Green
