# pi

Global config for the [pi](https://pi.dev) coding agent, symlinked into `~/.pi`
by `../sync.sh`.

## What is tracked

| Path | Why |
|---|---|
| `agent/settings.json` | provider/model defaults, theme, and the `packages` list |
| `agent/extensions/` | hand-written extensions that exist nowhere else |

Everything else under `~/.pi/agent` stays local and unlinked:

| Path | Why not |
|---|---|
| `auth.json` | live OAuth tokens |
| `sessions/` | ~37 MB of chat transcripts from every repo |
| `npm/`, `git/` | installed packages, rebuilt from `settings.json` |
| `models-store.json` | regenerable cache |

`sync.sh` links the two tracked paths individually rather than linking
`~/.pi/agent` as a whole, so `auth.json` never lives inside a git working tree.

## New machine

```shell
./sync.sh                  # link settings.json + extensions/
pi update --extensions     # install everything in settings.packages
pi                         # /login per provider — auth is never synced
```

## Installing packages

`pi install` rewrites `settings.json` in place, through the symlink, so a new
package shows up as a diff in this repo. Commit it and the next machine picks it
up on `pi update --extensions`.

`lastChangelogVersion` also lives in this file and changes on pi upgrades. It is
shared deliberately: splitting it out costs a second config file to avoid a
one-line diff.
