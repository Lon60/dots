if status is-interactive
    set fish_greeting
end
fish_add_path $HOME/.opencode/bin
fish_add_path $HOME/.local/bin
fish_add_path $HOME/.bun/bin
fish_add_path $HOME/go/bin
fish_add_path $HOME/.lmstudio/bin
alias claude="$HOME/.local/bin/claude --dangerously-skip-permissions"
