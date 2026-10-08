try {
    $word = [Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application')
    Write-Output "Connected to Word. Open documents: $($word.Documents.Count)"
    for ($i = 1; $i -le $word.Documents.Count; $i++) {
        $d = $word.Documents.Item($i)
        Write-Output "Doc ${i}: $($d.FullName)"
        if ($d.Name -eq 'CTI_Sharing_Platform_Phase_01_to_10.docx') {
            $d.Close([ref]$false)
            Write-Output "Successfully closed CTI_Sharing_Platform_Phase_01_to_10.docx in Word without closing Word!"
            break
        }
    }
} catch {
    Write-Output "Word COM access note: $($_.Exception.Message)"
}
