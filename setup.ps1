# Quick Start Script for Windows

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "The new collage Kolhapur Setup Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    if (Test-Path ".env.example") {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env file created. Please edit it with your credentials." -ForegroundColor Green
        Write-Host ""
        Write-Host "You need to add:" -ForegroundColor Yellow
        Write-Host "  1. Supabase URL and API Key" -ForegroundColor White
        Write-Host "  2. Gemini API Key" -ForegroundColor White
        Write-Host "  3. Session Secret" -ForegroundColor White
        Write-Host ""
        Write-Host "After updating .env, run this script again." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure Supabase (see SETUP_GUIDE.md)" -ForegroundColor White
Write-Host "2. Update .env with your credentials" -ForegroundColor White
Write-Host "3. Run: npm start" -ForegroundColor White
Write-Host ""
Write-Host "For detailed setup instructions, see SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to start the server
$response = Read-Host "Do you want to start the server now? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "Starting server..." -ForegroundColor Yellow
    Write-Host "Access the application at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    npm start
}
