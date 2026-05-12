hl.unbind("SUPER + W")
hl.unbind("SUPER + B")
hl.unbind("SUPER + SLASH")

hl.bind("SUPER + B", hl.dsp.exec_cmd("brave"), {description = "Brave"} )
hl.bind("SUPER + Z", hl.dsp.exec_cmd("zeditor"), {description = "Zed"} )
hl.bind("SUPER + H", hl.dsp.global("quickshell:cheatsheetToggle"), {description = "Toggle cheatsheet"} )
