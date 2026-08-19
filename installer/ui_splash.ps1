param(
  [Parameter(Mandatory=$true)][string]$SplashPath,
  [Parameter(Mandatory=$true)][string]$HintsPath,
  [Parameter(Mandatory=$true)][string]$StatusPath,
  [Parameter(Mandatory=$true)][string]$VersionPath,
  [Parameter(Mandatory=$true)][string]$DonePath
)
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
$window = New-Object System.Windows.Window
$window.Title = 'DiceBound'
$window.Width = 1000
$window.Height = 620
$window.WindowStartupLocation = 'CenterScreen'
$window.ResizeMode = 'NoResize'
$window.Background = [System.Windows.Media.Brushes]::Black
$grid = New-Object System.Windows.Controls.Grid
$window.Content = $grid
$image = New-Object System.Windows.Controls.Image
$bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
$bitmap.BeginInit(); $bitmap.CacheOption = 'OnLoad'; $bitmap.UriSource = New-Object System.Uri($SplashPath); $bitmap.EndInit()
$image.Source = $bitmap; $image.Stretch = 'UniformToFill'; $grid.Children.Add($image) | Out-Null
$overlay = New-Object System.Windows.Controls.Border
$overlay.Background = New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromArgb(220,8,11,18))
$overlay.VerticalAlignment = 'Bottom'; $overlay.Padding = '28,15,28,18'; $grid.Children.Add($overlay) | Out-Null
$stack = New-Object System.Windows.Controls.StackPanel; $overlay.Child = $stack
$status = New-Object System.Windows.Controls.TextBlock
$status.FontFamily='Segoe UI Semibold'; $status.FontSize=19; $status.Foreground='White'; $status.TextWrapping='Wrap'; $stack.Children.Add($status) | Out-Null
$version = New-Object System.Windows.Controls.TextBlock
$version.FontFamily='Segoe UI'; $version.FontSize=11; $version.Foreground='#C0C9DC'; $version.Margin='0,3,0,11'; $stack.Children.Add($version) | Out-Null
$hint = New-Object System.Windows.Controls.TextBlock
$hint.FontFamily='Segoe UI'; $hint.FontStyle='Italic'; $hint.FontSize=12; $hint.Foreground='#EEC97E'; $hint.TextWrapping='Wrap'; $stack.Children.Add($hint) | Out-Null
$hints=@(); try {$hints=@(Get-Content -LiteralPath $HintsPath | ? { -not [string]::IsNullOrWhiteSpace($_) })} catch {}
if($hints.Count -eq 0){$hints=@('The road is waiting.')}; $script:i=[Math]::Abs([Environment]::TickCount)%$hints.Count; $hint.Text='Road whisper: '+$hints[$script:i]
$poll=New-Object System.Windows.Threading.DispatcherTimer; $poll.Interval=[TimeSpan]::FromMilliseconds(350)
$poll.Add_Tick({try{if(Test-Path $StatusPath){$status.Text=[IO.File]::ReadAllText($StatusPath)};if(Test-Path $VersionPath){$version.Text=[IO.File]::ReadAllText($VersionPath)};if(Test-Path $DonePath){$window.Close()}}catch{}});$poll.Start()
$rotate=New-Object System.Windows.Threading.DispatcherTimer;$rotate.Interval=[TimeSpan]::FromSeconds(4.2)
$rotate.Add_Tick({$script:i=($script:i+1)%$hints.Count;$hint.Text='Road whisper: '+$hints[$script:i]});$rotate.Start()
$window.Add_Closed({$poll.Stop();$rotate.Stop()});[void]$window.ShowDialog()
