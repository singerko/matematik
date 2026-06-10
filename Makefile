.PHONY: install add dev build release cap-sync cap-assets version rebuild-apk sign install-apk deploy

# Run npm install in a container
install:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:20 npm install

# Run npm install <package> in a container
# Usage: make add PKG="package-name"
add:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:20 npm install $(PKG)

# Run dev server in a container
dev:
	podman run --rm -it -v "$$(pwd):/app" -w "/app" -p 5173:5173 node:20 npm run dev -- --host

# Build web assets in a container
build:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:20 npm run build

# Build uploadable static website package
release: build
	rm -f matematik.zip
	cd dist && zip -qr ../matematik.zip .
	@echo "Release complete! Upload ./matematik.zip to your web host."

# Sync Capacitor
cap-sync:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:22 npx cap sync

# Generate Android icons and splash screens from assets/
cap-assets:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:22 npx @capacitor/assets generate --android

# Bump version (patch)
version:
	podman run --rm -v "$$(pwd):/app" -w "/app" node:20 npm version patch --no-git-tag-version

# Full rebuild: Web Build -> Cap Sync -> Gradle Assemble -> Copy APK
rebuild-apk: version build
	make cap-sync
	podman run --rm -v "$$(pwd):/project" -w "/project/android" docker.io/mingc/android-build-box bash -c "./gradlew assembleDebug"
	cp android/app/build/outputs/apk/debug/app-debug.apk ./Matematik.apk
	@echo "Build complete! APK is at ./Matematik.apk"

sign:
	../android.sign.sh Matematik.apk Matematik.sign.apk

install-apk:
	adb install -r Matematik.sign.apk

deploy: rebuild-apk sign install-apk
