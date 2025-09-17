# PowerShell script to read Microsoft credentials from c:\dev\begin.env and set GitHub secrets
# Run this script from the repository root directory

$envFile = "c:\dev\begin.env"

if (-not (Test-Path $envFile)) {
    Write-Error "Environment file not found at $envFile"
    exit 1
}

Write-Host "Reading Microsoft credentials from $envFile..."

# Read the environment file and extract Microsoft credentials
$envContent = Get-Content $envFile
$microsoftClientId = ""
$microsoftClientSecret = ""
$microsoftTenantId = ""

foreach ($line in $envContent) {
    if ($line -match "^MICROSOFT_CLIENT_ID=(.+)$") {
        $microsoftClientId = $matches[1]
    }
    elseif ($line -match "^MICROSOFT_CLIENT_SECRET=(.+)$") {
        $microsoftClientSecret = $matches[1]
    }
    elseif ($line -match "^MICROSOFT_TENANT_ID=(.+)$") {
        $microsoftTenantId = $matches[1]
    }
}

# Validate that all required credentials were found
if (-not $microsoftClientId) {
    Write-Error "MICROSOFT_CLIENT_ID not found in $envFile"
    exit 1
}

if (-not $microsoftClientSecret) {
    Write-Error "MICROSOFT_CLIENT_SECRET not found in $envFile"
    exit 1
}

if (-not $microsoftTenantId) {
    Write-Error "MICROSOFT_TENANT_ID not found in $envFile"
    exit 1
}

Write-Host "Found all Microsoft credentials. Setting GitHub secrets..."

# Set GitHub secrets using gh CLI
try {
    & gh secret set MICROSOFT_CLIENT_ID --body $microsoftClientId
    Write-Host "✓ Set MICROSOFT_CLIENT_ID"
    
    & gh secret set MICROSOFT_CLIENT_SECRET --body $microsoftClientSecret
    Write-Host "✓ Set MICROSOFT_CLIENT_SECRET"
    
    & gh secret set MICROSOFT_TENANT_ID --body $microsoftTenantId
    Write-Host "✓ Set MICROSOFT_TENANT_ID"
    
    Write-Host ""
    Write-Host "All Microsoft Graph API secrets have been set successfully!"
    Write-Host "The OneDrive integration will be available after the next deployment."
}
catch {
    Write-Error "Failed to set GitHub secrets. Make sure you have gh CLI installed and are authenticated."
    Write-Error "Run 'gh auth login' to authenticate with GitHub first."
    exit 1
}