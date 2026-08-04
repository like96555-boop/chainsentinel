# 直接探测 Kimi 上游（密钥仅本地变量，不打印）
$envFile = "C:\Users\37515\Desktop\临时AI\链哨ChainSentinel\.env"
$key = ""
$base = ""
foreach ($line in Get-Content $envFile) {
  if ($line -match '^KIMI_API_KEY=(.*)$') { $key = $Matches[1].Trim() }
  if ($line -match '^KIMI_BASE_URL=(.*)$') { $base = $Matches[1].Trim() }
}
$body = @{ model = 'kimi-for-coding'; stream = $false; messages = @(@{ role = 'user'; content = '用一句话回答：1+1等于几' }) } | ConvertTo-Json -Depth 5
$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
  $resp = Invoke-RestMethod -Uri "$base/chat/completions" -Method Post -Headers @{ Authorization = "Bearer $key" } -ContentType 'application/json' -Body $body -TimeoutSec 45
  $sw.Stop()
  Write-Host ("上游非流式 OK, " + $sw.ElapsedMilliseconds + "ms, 内容: " + $resp.choices[0].message.content)
} catch {
  $sw.Stop()
  Write-Host ("上游非流式失败, " + $sw.ElapsedMilliseconds + "ms: " + $_.Exception.Message)
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ("响应体: " + $sr.ReadToEnd().Substring(0, [Math]::Min(300, $sr.ReadToEnd().Length)))
  }
}
