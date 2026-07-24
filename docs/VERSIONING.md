# MOLGANG versioning

`MOLGANG_Demo.rbxl` is the versioned Studio handoff artifact. Luau and Rojo
configuration remain the source of truth; FBX/GLB source assets are tracked
with Git LFS through `.gitattributes`.

```bash
git lfs install
git pull
rojo build game -o MOLGANG_Demo.rbxl
git add .
git commit -m "build: update demo and assets"
git push origin main
git tag -a demo-v0.3.0 -m "MOLGANG demo v0.3.0"
git push origin demo-v0.3.0
```

Do not commit generated `build/` output as a second source of truth. Restore a
release with `git lfs pull` and a tagged checkout.
