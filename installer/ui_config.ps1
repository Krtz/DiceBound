param([Parameter(Mandatory=$true)][string]$DefaultDir,[string]$Desktop='true',[string]$StartMenu='true')
$DesktopChecked=[System.Convert]::ToBoolean($Desktop);$StartMenuChecked=[System.Convert]::ToBoolean($StartMenu)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$form=New-Object System.Windows.Forms.Form;$form.Text='DiceBound Setup';$form.ClientSize='640,250';$form.StartPosition='CenterScreen';$form.FormBorderStyle='FixedDialog';$form.MaximizeBox=$false;$form.MinimizeBox=$false;$form.TopMost=$true;$form.BackColor=[Drawing.Color]::FromArgb(22,26,36);$form.ForeColor='White'
$title=New-Object Windows.Forms.Label;$title.Text='Choose where DiceBound should live';$title.Font=New-Object Drawing.Font('Segoe UI Semibold',15);$title.AutoSize=$true;$title.Location='22,18';$form.Controls.Add($title)
$label=New-Object Windows.Forms.Label;$label.Text='Install folder';$label.AutoSize=$true;$label.Location='24,62';$form.Controls.Add($label)
$path=New-Object Windows.Forms.TextBox;$path.Text=$DefaultDir;$path.Location='24,82';$path.Size='500,25';$form.Controls.Add($path)
$browse=New-Object Windows.Forms.Button;$browse.Text='Browse...';$browse.Location='532,80';$browse.Size='82,28';$browse.Add_Click({$p=New-Object Windows.Forms.FolderBrowserDialog;$p.SelectedPath=$path.Text;if($p.ShowDialog()-eq'OK'){$path.Text=$p.SelectedPath}});$form.Controls.Add($browse)
$desk=New-Object Windows.Forms.CheckBox;$desk.Text='Create Desktop shortcut';$desk.Checked=$DesktopChecked;$desk.AutoSize=$true;$desk.Location='27,128';$form.Controls.Add($desk)
$start=New-Object Windows.Forms.CheckBox;$start.Text='Add DiceBound to the Start Menu';$start.Checked=$StartMenuChecked;$start.AutoSize=$true;$start.Location='27,154';$form.Controls.Add($start)
$cancel=New-Object Windows.Forms.Button;$cancel.Text='Cancel';$cancel.DialogResult='Cancel';$cancel.Location='432,196';$cancel.Size='82,30';$form.CancelButton=$cancel;$form.Controls.Add($cancel)
$ok=New-Object Windows.Forms.Button;$ok.Text='Continue';$ok.Location='522,196';$ok.Size='92,30';$form.AcceptButton=$ok;$form.Controls.Add($ok)
$script:r=$null;$ok.Add_Click({if([string]::IsNullOrWhiteSpace($path.Text)){[Windows.Forms.MessageBox]::Show('Choose an install folder first.','DiceBound Setup','OK','Warning')|Out-Null;return};$script:r=[pscustomobject]@{format=1;installDir=$path.Text.Trim();desktopShortcut=$desk.Checked;startMenuShortcut=$start.Checked};$form.DialogResult='OK';$form.Close()})
if($form.ShowDialog()-ne'OK'-or$null-eq$script:r){exit 2};$script:r|ConvertTo-Json -Compress
