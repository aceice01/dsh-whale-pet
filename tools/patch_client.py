# patch_client.py — replace the WebPet component in client.js with the
# rootRef-based version (hide actually hides the panel). Applies to both
# the Electron profile and the npx (.dsh) profile.
import io, re

WEBPET_SRC = r"D:\Desktop\new\dsh-whale-pet\lib\webpet.js"
TARGETS = [
    r"C:\Users\22002\AppData\Roaming\dsh-desktop-client\dsh\profiles\web\node_modules\dsh-balance-widget\lib\client.js",
    r"C:\Users\22002\.dsh\profiles\web\node_modules\dsh-balance-widget\lib\client.js",
]

with io.open(WEBPET_SRC, "r", encoding="utf-8") as f:
    webpet = f.read()

# extract the WebPet function body (from "function WebPet() {" to the matching
# closing brace of the function, before "/** Client plugin body" or next const)
start = webpet.index("function WebPet()")
end = webpet.index("/**", start)
new_func = webpet[start:end].rstrip() + "\n"

for path in TARGETS:
    with io.open(path, "r", encoding="utf-8") as f:
        c = f.read()
    old_start = c.index("function WebPet()")
    old_end = c.index("/**", old_start)
    # find the closing of the function: it ends right before "/** Client plugin"
    # actually the function is followed by blank line then "/** Client plugin body"
    replaced = c[:old_start] + new_func + c[old_end:]
    with io.open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(replaced)
    ok = "rootRef" in replaced and "dswp-drag" in replaced
    print(f"{path}\n  -> WebPet replaced, rootRef={ok}")

print("done")
