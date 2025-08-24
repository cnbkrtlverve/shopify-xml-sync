Write-Host "Testing Shopify Check Endpoint..." -ForegroundColor Green
Write-Host ""

Write-Host "1. Test without headers:" -ForegroundColor Yellow
try {
    $response1 = Invoke-RestMethod -Uri "https://vervegranxml.netlify.app/.netlify/functions/api/shopify/check" -Method GET -ContentType "application/json"
    $response1 | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. Test with headers:" -ForegroundColor Yellow
try {
    $headers = @{
        'X-Shopify-Shop-Url' = 'test-store.myshopify.com'
        'X-Shopify-Access-Token' = 'shpat_test_token'
        'Content-Type' = 'application/json'
    }
    $response2 = Invoke-RestMethod -Uri "https://vervegranxml.netlify.app/.netlify/functions/api/shopify/check" -Method GET -Headers $headers
    $response2 | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
