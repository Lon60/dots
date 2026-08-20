#!/usr/bin/env bash
# sync.sh — link this repo's config modules into ~/.config
#
# Usage:
#   ./sync.sh --dry-run   # show what would happen, change nothing
#   ./sync.sh             # apply
#
# Each module <repo>/<name> becomes a symlink target for ~/.config/<name>.
# An existing real directory is moved to ~/.config/<name>.bak-<epoch> first;
# machine-local files listed in `keep` (e.g. nwg-displays output) are copied
# into the repo module beforehand so this device keeps them. Safe to re-run.
#
# `links` handles paths outside ~/.config, one entry per leaf. Linking leaves
# rather than whole directories keeps secrets and machine state (~/.pi's
# auth.json, sessions/) out of the repo working tree entirely, so no gitignore
# rule stands between an API token and a `git add -A`.

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
config_dir="$HOME/.config"

modules=(hypr fish noctalia)

# <repo-relative source> -> <$HOME-relative destination>
declare -A links=(
	[pi/agent/settings.json]=".pi/agent/settings.json"
	[pi/agent/extensions]=".pi/agent/extensions"
)

# per-module machine-local files that must survive the switch (gitignored)
declare -A keep=(
	[hypr]="monitors.lua workspaces.lua"
	[fish]="fish_variables conf.d completions functions auto-Hypr.fish"
)

dry_run=0
case "${1:-}" in
-n | --dry-run) dry_run=1 ;;
"") ;;
*)
	echo "usage: $0 [-n|--dry-run]" >&2
	exit 2
	;;
esac

log() {
	if ((dry_run)); then echo "[dry-run] $*"; else echo "$*"; fi
}
run() { ((dry_run)) || "$@"; }

sync_module() {
	local name="$1"
	local src="$repo_dir/$name"
	local dst="$config_dir/$name"

	if [[ ! -d $src ]]; then
		echo "$name: no $src in repo, skip" >&2
		return
	fi

	if [[ -L $dst && $(readlink -f "$dst") == "$(readlink -f "$src")" ]]; then
		echo "$name: already linked, skip"
		return
	fi

	if [[ -L $dst ]]; then
		log "$name: replace foreign symlink ($(readlink "$dst"))"
		run rm "$dst"
	elif [[ -e $dst ]]; then
		log "$name: $dst exists"
		local f
		for f in ${keep[$name]:-}; do
			if [[ -e $dst/$f && ! -e $src/$f ]]; then
				log "  keep machine-local $f -> $src/"
				run cp -a "$dst/$f" "$src/$f"
			fi
		done
		local bak="$dst.bak-$(date +%s)"
		log "  move to $bak"
		run mv "$dst" "$bak"
	fi

	log "$name: link $dst -> $src"
	run ln -sT "$src" "$dst"
}

sync_link() {
	local src="$repo_dir/$1"
	local dst="$HOME/$2"

	if [[ ! -e $src ]]; then
		echo "$1: no $src in repo, skip" >&2
		return
	fi

	if [[ -L $dst && $(readlink -f "$dst") == "$(readlink -f "$src")" ]]; then
		echo "$1: already linked, skip"
		return
	fi

	if [[ -L $dst ]]; then
		log "$1: replace foreign symlink ($(readlink "$dst"))"
		run rm "$dst"
	elif [[ -e $dst ]]; then
		local bak="$dst.bak-$(date +%s)"
		log "$1: $dst exists, move to $bak"
		run mv "$dst" "$bak"
	fi

	log "$1: link $dst -> $src"
	run mkdir -p "$(dirname "$dst")"
	run ln -sT "$src" "$dst"
}

run mkdir -p "$config_dir"
for m in "${modules[@]}"; do
	sync_module "$m"
done
for l in "${!links[@]}"; do
	sync_link "$l" "${links[$l]}"
done
