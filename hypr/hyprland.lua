local ipc = "noctalia msg"
-- display
hl.monitor({ output = "", mode = "preferred", position = "auto", scale = 1 })
pcall(require, "monitors")
pcall(require, "workspaces")

-- app keybinds
hl.bind("SUPER + Return", hl.dsp.exec_cmd("kitty"))
hl.bind("SUPER + B", hl.dsp.exec_cmd("zen-browser"))
hl.bind("SUPER + SHIFT + B", hl.dsp.exec_cmd("librewolf"))
hl.bind("SUPER + Z", hl.dsp.exec_cmd("zeditor"))
hl.bind("SUPER + E", hl.dsp.exec_cmd("dolphin"))

--lock
hl.bind("SUPER + SHIFT + Q", hl.dsp.exec_cmd(ipc .. " session lock"))

-- open panel
hl.bind("CTRL + ALT + DELETE", hl.dsp.exec_cmd(ipc .. " panel-open session"))

--## window keybinds
hl.bind("SUPER + Q", hl.dsp.window.close())

-- move focus
hl.bind("SUPER + h", hl.dsp.focus({ direction = "l" }))
hl.bind("SUPER + l", hl.dsp.focus({ direction = "r" }))
hl.bind("SUPER + k", hl.dsp.focus({ direction = "u" }))
hl.bind("SUPER + j", hl.dsp.focus({ direction = "d" }))

-- move focus workspace
hl.bind("CTRL + SUPER + h", hl.dsp.focus({ workspace = "r-1" }))
hl.bind("CTRL + SUPER + l", hl.dsp.focus({ workspace = "r+1" }))

-- move window
hl.bind("SUPER + SHIFT + h", hl.dsp.window.move({ direction = "l" }))
hl.bind("SUPER + SHIFT + l", hl.dsp.window.move({ direction = "r" }))
hl.bind("SUPER + SHIFT + k", hl.dsp.window.move({ direction = "u" }))
hl.bind("SUPER + SHIFT + j", hl.dsp.window.move({ direction = "d" }))

-- move window to workspace
hl.bind("CTRL + SUPER + SHIFT + H", hl.dsp.window.move({ workspace = "r-1" }))
hl.bind("CTRL + SUPER + SHIFT + L", hl.dsp.window.move({ workspace = "r+1" }))

-- fullscreen
hl.bind("SUPER + D", hl.dsp.window.fullscreen({ mode = "maximized", action = "toggle" }))
hl.bind("SUPER + F", hl.dsp.window.fullscreen({ mode = "fullscreen", action = "toggle" }))

-- Core binds
hl.bind("SUPER + Space", hl.dsp.exec_cmd(ipc .. " panel-toggle launcher"))
hl.bind("SUPER + S", hl.dsp.exec_cmd(ipc .. " panel-toggle control-center"))
hl.bind("SUPER + comma", hl.dsp.exec_cmd(ipc .. " settings-toggle"))

-- Media keys
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd(ipc .. " volume-up"))
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd(ipc .. " volume-down"))
hl.bind("XF86AudioMute", hl.dsp.exec_cmd(ipc .. " volume-mute"))
hl.bind("XF86MonBrightnessUp", hl.dsp.exec_cmd(ipc .. " brightness-up"))
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd(ipc .. " brightness-down"))

-- screenshot region -> clipboard
hl.bind("SUPER + SHIFT + S", hl.dsp.exec_cmd([[grim -g "$(slurp -d)" - | wl-copy]]))

-- general
hl.config({

	input = {
		kb_layout = "ch",
		kb_variant = "de",
	},

	misc = {
		force_default_wallpaper = 0,
		disable_hyprland_logo = true,
		disable_splash_rendering = true,
		middle_click_paste = false,
		on_focus_under_fullscreen = 2,
	},

	general = {
		gaps_in = 2,
		gaps_out = 5,
		--	allow_tearing = true,
	},

	decoration = {
		rounding = 10,
		rounding_power = 2,

		shadow = {
			enabled = true,
			range = 4,
			render_power = 3,
			color = 0xee1a1a1a,
		},

		blur = {
			enabled = true,
			size = 3,
			passes = 2,
			vibrancy = 0.1696,
		},
	},
})

-- animations
hl.curve("emphasizedDecel", { type = "bezier", points = { { 0.05, 0.7 }, { 0.1, 1 } } })
hl.curve("menu_decel", { type = "bezier", points = { { 0.1, 1 }, { 0, 1 } } })

hl.animation({ leaf = "windows", enabled = true, speed = 3, bezier = "emphasizedDecel", style = "popin 85%" })
hl.animation({ leaf = "fade", enabled = true, speed = 3, bezier = "emphasizedDecel" })
hl.animation({ leaf = "workspaces", enabled = true, speed = 5, bezier = "emphasizedDecel", style = "slide" })
hl.animation({ leaf = "workspaces", enabled = true, speed = 7, bezier = "menu_decel", style = "slide" })

hl.layer_rule({
	name = "noctalia",
	match = {
		namespace = "^noctalia-(bar-.+|notification|dock|panel|attached-panel|osd)$",
	},
	no_anim = true,
	ignore_alpha = 0.5,
	blur = true,
	blur_popups = true,
})

-- hl.window_rule({ match = { class = "^(steam_app).*" }, immediate = true })
hl.window_rule({
	match = { class = "dev.noctalia.Noctalia" },
	float = true,
	size = { 1080, 920 },
})
-- autostart noctalia: https://github.com/noctalia-dev/noctalia
hl.on("hyprland.start", function()
	hl.exec_cmd("noctalia")
end)

-- env
hl.env("QT_QPA_PLATFORMTHEME", "qt6ct")
