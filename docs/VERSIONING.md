# MOLGANG versioning

`MOLGANG_OTAP_Test.rbxl` is the versioned OTAP teststraat handoff artifact.
Luau and Rojo
configuration remain the source of truth; FBX/GLB source assets are tracked
with Git LFS through `.gitattributes`.

```bash
git lfs install
git pull
rojo build game -o MOLGANG_OTAP_Test.rbxl
git add .
git commit -m "build: update OTAP teststraat and assets"
git push origin main
git tag -a otap-test-v0.1.0 -m "MOLGANG OTAP teststraat v0.1.0"
git push origin otap-test-v0.1.0
```

Do not commit generated `build/` output as a second source of truth. Restore a
release with `git lfs pull` and a tagged checkout.
