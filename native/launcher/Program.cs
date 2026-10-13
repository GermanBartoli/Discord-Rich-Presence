using System.Diagnostics;

var script = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "host.mjs"));
var node = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
if (!File.Exists(node) || !File.Exists(script)) return 1;

using var child = Process.Start(new ProcessStartInfo(node)
{
    ArgumentList = { script },
    UseShellExecute = false,
    RedirectStandardInput = true,
    RedirectStandardOutput = true,
    RedirectStandardError = true,
    CreateNoWindow = true
});
if (child is null) return 1;

var input = Console.OpenStandardInput();
var output = Console.OpenStandardOutput();
var error = Console.OpenStandardError();
var toChild = input.CopyToAsync(child.StandardInput.BaseStream).ContinueWith(_ => child.StandardInput.Close());
var fromChild = child.StandardOutput.BaseStream.CopyToAsync(output);
var errors = child.StandardError.BaseStream.CopyToAsync(error);
await Task.WhenAny(toChild, fromChild);
if (!child.HasExited) child.Kill();
await child.WaitForExitAsync();
return child.ExitCode;
