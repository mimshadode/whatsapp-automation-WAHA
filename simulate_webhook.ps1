$headers = @{ "Content-Type" = "application/json" }
$payload = @{
    id = "test_debug_final"
    event = "message"
    session = "default"
    payload = @{
        id = "false_66580767604826@lid_3EB0E3845810C5D2DAA407"
        timestamp = 1769023098
        from = "66580767604826@lid"
        fromMe = $false
        body = "buat form dari dokumen ini"
        hasMedia = $true
        media = @{
            url = "http://localhost:3000/api/files/default/3EB0E3845810C5D2DAA407.pdf"
            filename = "lampiran.pdf"
            mimetype = "application/pdf"
        }
    }
}
$body = $payload | ConvertTo-Json -Depth 4
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/webhook" -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "Success: $($response.StatusCode)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
