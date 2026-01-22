$headers = @{ "Content-Type" = "application/json" }
$payload = @{
    id = "test_reply_debug"
    event = "message"
    session = "default"
    payload = @{
        id = "false_66580767604826@lid_REPLY_ID"
        timestamp = 1769023100
        from = "66580767604826@lid"
        fromMe = $false
        body = "buat form dari dokumen ini"
        hasMedia = $false
        _data = @{
            quotedStanzaID = "3EB0E3845810C5D2DAA407"
            quotedParticipant = "66580767604826@lid"
            quotedMsg = @{
                type = "document"
                mimetype = "application/pdf"
            }
        }
    }
}
$body = $payload | ConvertTo-Json -Depth 5
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/webhook" -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "Success: $($response.StatusCode)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
