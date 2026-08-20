if status is-interactive
    set fish_greeting
end
fish_add_path $HOME/.opencode/bin
fish_add_path $HOME/.local/bin
fish_add_path $HOME/.bun/bin
fish_add_path $HOME/go/bin
fish_add_path $HOME/.lmstudio/bin
alias claude="$HOME/.local/bin/claude --dangerously-skip-permissions"

set -gx GPG_TTY (tty)
set -gx PI_WEB_TOOLS_EXA_ENDPOINT "https://mcp.exa.ai/mcp"
